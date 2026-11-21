import type {CryptoHelper} from "../../../network/crypto/CryptoHelper.ts";
import type {Payload} from "../../../network/Payload.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {Log} from "../../../worker/log.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {ClientChannel} from "./ClientChannel.ts";

export class ClientEncryptChannel extends ClientChannel {
    private readonly group: CryptoHelper;
    private readonly session: CryptoHelper;
    private recvTail = Promise.resolve();
    private sendTail = Promise.resolve();

    public constructor(group: CryptoHelper, session: CryptoHelper) {
        super();
        this.group = group;
        this.session = session;
    }

    public override broadcast(payload: Payload): void {
        const size = payload.estimateSize?.() ?? 7;
        const writer = new BinaryWriter(size + 32);
        this.out.codec.encode(writer, payload);

        const task = this.encrypt(writer, this.getSessionId());
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
                // 服务端广播会忽视单客户端连接状况,所以得跳过
                const protocol = reader.readUint8();
                if (protocol !== this.in.protocol) return;
                this.decrypt(reader, this.group);
                return;
            case PacketHeader.SERVER_SINGLE:
                reader.skip(1);
                this.decrypt(reader, this.session);
                return;
        }
        console.warn(`[Client] Unknown header: ${header}`);
    }

    private async encrypt(writer: BinaryWriter, sid: number) {
        const iv = this.session.iv();
        const task = await this.session.encrypt(iv, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.C2S);
        writer.writeInt8(sid);
        writer.pushBytes(iv);
        writer.pushBytes(task);
        return writer.toUint8Array();
    }

    protected decrypt(reader: BinaryReader, crypto: CryptoHelper) {
        try {
            const iv = reader.readSlice(crypto.ivLength);
            const remain = reader.readSlice(reader.bytesRemaining());
            const task = crypto.decrypt(iv, remain);

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