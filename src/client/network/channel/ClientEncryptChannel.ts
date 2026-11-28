import type {Payload} from "../../../network/Payload.ts";
import type {GCMSession} from "../../../network/crypto/GCMSession.ts";
import type {GCMDecrypt} from "../../../network/crypto/GCMDecrypt.ts";
import type {ClientBus} from "../bus/ClientBus.ts";
import {buildEncrypt} from "../../../network/FrameUtil.ts";
import {GCM_NONCE_BYTES} from "../../../network/crypto/GCMHelper.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {Log} from "../../../utils/Log.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {ClientChannel} from "./ClientChannel.ts";
import {ConnectionState} from "../../../network/ConnectionState.ts";

export class ClientEncryptChannel extends ClientChannel {
    private readonly session: GCMSession;
    private group: GCMDecrypt = null!;

    private recvTail = Promise.resolve();
    private sendTail = Promise.resolve();

    public constructor(bus: ClientBus, session: GCMSession) {
        super(bus);
        this.session = session;
    }

    public setGroupKey(group: GCMDecrypt) {
        this.group = group;
    }

    public available() {
        return !this.session.exhausted() && this.group != null;
    }

    public override send(payload: Payload) {
        const size = payload.estimateSize?.() ?? 7;
        const writer = new BinaryWriter(size + 32);
        this.out.codec.encode(writer, payload);

        const task = buildEncrypt(this.session, writer, PacketHeader.C2S, this.getSid());
        const next = this.sendTail.then(async () => {
            const buffer = await task;
            if (this.bus.isConnected()) this.bus.sendFrame(buffer);
        });
        this.sendTail = next.catch(err => Log.error(err));
    }

    public override feed(reader: BinaryReader) {
        const header = reader.readUint8();
        switch (header) {
            case PacketHeader.RELAY:
                return;
            case PacketHeader.SERVER_BROADCAST:
                reader.skip(1);
                // group may not init, and PLAY stage's message also meaningless now.
                if (this.in.protocol !== ConnectionState.PLAY) return;
                this.decrypt(reader, this.group);
                return;
            case PacketHeader.SERVER_SINGLE:
                reader.skip(1);
                this.decrypt(reader, this.session);
                return;
        }
        console.warn(`[Client] Unknown header: ${header}`);
    }

    private decrypt(reader: BinaryReader, session: GCMDecrypt) {
        try {
            const nonce = reader.readSlice(GCM_NONCE_BYTES);
            const remain = reader.readSlice(reader.bytesRemaining());
            const task = session.decrypt(nonce, remain);

            const next = this.recvTail.then(async () => {
                const buffer = new Uint8Array(await task);
                const decrypted = new BinaryReader(buffer);
                this.decode(decrypted);
            });
            this.recvTail = next.catch(err => this.handler.report(err));
        } catch (err) {
            this.handler.report(err);
        }
    }
}