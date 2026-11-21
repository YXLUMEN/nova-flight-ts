import type {Payload} from "../../../network/Payload.ts";
import type {EncryptEgress} from "../bus/EncryptEgress.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {SessionChannel} from "./SessionChannel.ts";
import {CryptoHelper} from "../../../network/crypto/CryptoHelper.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";

export class EncryptSessionChannel extends SessionChannel {
    declare protected readonly bus: EncryptEgress;
    private crypto: CryptoHelper = null!;
    private recvTail = Promise.resolve();

    public constructor(bus: EncryptEgress, sid: number) {
        super(bus, sid);
    }

    public setKey(key: CryptoHelper) {
        this.crypto = key;
    }

    public override unicast(payload: Payload) {
        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 32);
        this.out.encode(writer, payload);

        const task = this.encrypt(writer, this.sid);
        this.bus.thenSend(task);
    }

    public override onMessage(reader: BinaryReader) {
        try {
            const iv = reader.readSlice(this.crypto.ivLength);
            const remain = reader.readSlice(reader.bytesRemaining());
            const task = this.crypto.decrypt(iv, remain);

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
        const iv = this.crypto.iv();
        const task = await this.crypto.encrypt(iv, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.SERVER_SINGLE);
        writer.writeInt8(sid);
        writer.pushBytes(iv);
        writer.pushBytes(task);
        return writer.toUint8Array();
    }
}