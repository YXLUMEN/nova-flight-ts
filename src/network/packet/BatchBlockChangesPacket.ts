import {type Payload, payloadId, type PayloadId} from "../Payload.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";
import type {BlockChange} from "../../world/map/BlockChange.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {ClientNetworkHandler} from "../../client/network/ClientNetworkHandler.ts";
import type {ServerPlayHandler} from "../../server/network/handler/ServerPlayHandler.ts";
import {varUintSize} from "../../utils/NetUtil.ts";

export class BatchBlockChangesPacket implements Payload {
    public static readonly ID: PayloadId<BatchBlockChangesPacket> = payloadId('batch_block_changes');
    public static readonly CODEC: PacketCodec<BatchBlockChangesPacket> = PacketCodecs.of(this.write, this.read);

    private readonly types: Uint8Array<ArrayBuffer>;
    private readonly xs: Uint32Array<ArrayBuffer>;
    private readonly ys: Uint32Array<ArrayBuffer>;

    public constructor(types: Uint8Array<ArrayBuffer>, xs: Uint32Array<ArrayBuffer>, ys: Uint32Array<ArrayBuffer>) {
        this.types = types;
        this.xs = xs;
        this.ys = ys;
    }

    public static empty() {
        const buffer = new ArrayBuffer(0);
        return new BatchBlockChangesPacket(new Uint8Array(buffer), new Uint32Array(buffer), new Uint32Array(buffer));
    }

    public static from(changes: BlockChange[]) {
        if (changes.length === 0) {
            return BatchBlockChangesPacket.empty();
        }

        const len = changes.length;
        const padding = (4 - (len % 4)) % 4;
        const xsSize = len * 4;
        const ysSize = len * 4;
        const totalSize = len + padding + xsSize + ysSize;

        const buffer = new ArrayBuffer(totalSize);
        const types = new Uint8Array(buffer, 0, len);
        const xs = new Uint32Array(buffer, len + padding, len);
        const ys = new Uint32Array(buffer, len + padding + xsSize, len);

        for (let i = 0; i < len; i++) {
            types[i] = changes[i].type;
            xs[i] = changes[i].x;
            ys[i] = changes[i].y;
        }

        return new BatchBlockChangesPacket(types, xs, ys);
    }

    public static write(writer: BinaryWriter, value: BatchBlockChangesPacket): void {
        const len = value.types.length;
        writer.writeVarUint(len);

        writer.pushBytes(value.types);
        const padding = (4 - (writer.getOffset() % 4)) % 4;
        for (let i = 0; i < padding; i++) {
            writer.writeInt8(0);
        }

        for (let i = 0; i < len; i++) writer.writeUint32(value.xs[i]);
        for (let i = 0; i < len; i++) writer.writeUint32(value.ys[i]);
    }

    public static read(reader: BinaryReader): BatchBlockChangesPacket {
        const len = reader.readVarUint();
        if (len === 0) {
            return BatchBlockChangesPacket.empty();
        }

        const types = reader.readSlice(len);

        const current = reader.getOffset();
        const padding = (4 - (current % 4)) % 4;
        if (padding > 0) reader.skip(padding);

        const xsBytes = reader.readSlice(4 * len);
        const ysBytes = reader.readSlice(4 * len);

        const xs = new Uint32Array(xsBytes.buffer, xsBytes.byteOffset, len);
        const ys = new Uint32Array(ysBytes.buffer, ysBytes.byteOffset, len);
        return new BatchBlockChangesPacket(types, xs, ys);
    }

    public getId(): PayloadId<BatchBlockChangesPacket> {
        return BatchBlockChangesPacket.ID;
    }

    public accept(listener: ClientNetworkHandler | ServerPlayHandler): void {
        listener.onBatchChanges(this);
    }

    public estimateSize(): number {
        const len = this.types.length;
        const varUintLen = varUintSize(len);
        const prePadding = varUintLen + len;
        const padding = (4 - (prePadding % 4)) % 4;
        return prePadding + padding + (len << 3);
    }

    public foreach(consumer: (type: number, x: number, y: number) => void) {
        for (let i = 0; i < this.types.length; i++) {
            consumer(this.types[i], this.xs[i], this.ys[i]);
        }
    }

    public filter(predicate: (type: number, x: number, y: number) => boolean): BatchBlockChangesPacket {
        const {types, xs, ys} = this;
        const len = types.length;

        const newTypes = new Uint8Array(len);
        const newXs = new Uint32Array(len);
        const newYs = new Uint32Array(len);

        let writeIndex = 0;
        for (let i = 0; i < len; i++) {
            const type = types[i];
            const x = xs[i];
            const y = ys[i];
            if (predicate(type, x, y)) {
                newTypes[writeIndex] = type;
                newXs[writeIndex] = x;
                newYs[writeIndex] = y;
                writeIndex++;
            }
        }

        if (writeIndex === 0) {
            return new BatchBlockChangesPacket(
                new Uint8Array(0),
                new Uint32Array(0),
                new Uint32Array(0)
            );
        }

        return new BatchBlockChangesPacket(
            newTypes.subarray(0, writeIndex),
            newXs.subarray(0, writeIndex),
            newYs.subarray(0, writeIndex)
        );
    }
}