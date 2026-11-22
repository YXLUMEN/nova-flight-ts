import type {Payload} from "../../../network/Payload.ts";
import type {GCMSession} from "../../../network/crypto/GCMSession.ts";
import type {GCMEncrypt} from "../../../network/crypto/GCMEncrypt.ts";
import type {GCMDecrypt} from "../../../network/crypto/GCMDecrypt.ts";
import {GCM_NONCE_BYTES} from "../../../network/crypto/GCMHelper.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {Log} from "../../../worker/log.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {ClientChannel} from "./ClientChannel.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class ClientEncryptChannel extends ClientChannel {
    private readonly group: GCMDecrypt;
    private readonly session: GCMSession;

    private recvTail = Promise.resolve();
    private sendTail = Promise.resolve();

    public constructor(group: GCMDecrypt, session: GCMSession) {
        super();
        this.group = group;
        this.session = session;
    }

    public override broadcast(payload: Payload): void {
        const size = payload.estimateSize?.() ?? 7;
        const writer = new BinaryWriter(size + 32);
        this.out.codec.encode(writer, payload);

        const task = this.encrypt(this.session, writer, this.getSessionId());
        const next = this.sendTail.then(async () => {
            const buffer = await task;
            if (this.bus.isConnected()) this.bus.sendBuffer(buffer);
        });
        this.sendTail = next.catch(err => Log.error(err));
    }

    public override onMessage(reader: BinaryReader) {
        const header = reader.readUint8();
        switch (header) {
            case PacketHeader.RELAY:
                return;
            case PacketHeader.SERVER_BROADCAST:
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

    private async encrypt(encrypt: GCMEncrypt, writer: BinaryWriter, sid: number) {
        const nonce = encrypt.nonce();
        const encrypted = await encrypt.encrypt(nonce, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.C2S);
        writer.writeInt8(sid);
        writer.pushBytes(nonce);
        writer.pushBytes(encrypted);
        return writer.toUint8Array();
    }

    protected decrypt(reader: BinaryReader, session: GCMDecrypt) {
        try {
            const iv = reader.readSlice(GCM_NONCE_BYTES);
            const remain = reader.readSlice(reader.bytesRemaining());
            const task = session.decrypt(iv, remain);

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