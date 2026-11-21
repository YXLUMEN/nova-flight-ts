import type {Payload} from "../../../network/Payload.ts";
import type {EncryptEgress} from "../bus/EncryptEgress.ts";
import type {GCMSession} from "../../../network/crypto/GCMSession.ts";
import {GCM_NONCE_BYTES} from "../../../network/crypto/GCMHelper.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {SessionChannel} from "./SessionChannel.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {NonceExhaustedError} from "../../../type/errors.ts";

export class EncryptSessionChannel extends SessionChannel {
    declare protected readonly bus: EncryptEgress;
    private readonly session: GCMSession;
    private recvTail = Promise.resolve();

    public constructor(bus: EncryptEgress, session: GCMSession, sid: number) {
        super(bus, sid);
        this.session = session;
    }

    public override unicast(payload: Payload) {
        if (this.session.exhausted()) {
            throw new NonceExhaustedError();
        }

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 32);
        this.out.encode(writer, payload);

        this.bus.thenSend(this.encrypt(writer, this.sid));
    }

    public override onMessage(reader: BinaryReader) {
        try {
            const nonce = reader.readSlice(GCM_NONCE_BYTES);
            const remain = reader.readSlice(reader.bytesRemaining());
            const task = this.session.decrypt(nonce, remain);

            const next = this.recvTail.then(async () => {
                const buffer = new Uint8Array(await task);
                const decrypted = new BinaryReader(buffer);
                super.onMessage(decrypted);
            });
            this.recvTail = next.catch(err => this.handler.report(err));
        } catch (err) {
            this.handler.report(err);
        }
    }

    private async encrypt(writer: BinaryWriter, sid: number) {
        const nonce = this.session.nonce();
        const encrypted = await this.session.encrypt(nonce, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.SERVER_SINGLE);
        writer.writeInt8(sid);
        writer.pushBytes(nonce);
        writer.pushBytes(encrypted);
        return writer.toUint8Array();
    }
}