import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import {
    decodeColorHex,
    decodeFromInt16,
    decodeFromUnsignedByte,
    encodeToInt16,
    encodeToUnsignedByte,
    encodeColorHex,
} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ParticleS2CPacket implements Payload {
    public static readonly ID: PayloadId<ParticleS2CPacket> = {id: Identifier.ofVanilla('particle')};
    public static readonly CODEC: PacketCodec<ParticleS2CPacket> = PacketCodecs.of(this.write, this.read);

    public readonly posX: number;
    public readonly posY: number;
    private readonly offsetXInt16: number;
    private readonly offsetYInt16: number;
    public readonly speed: number
    public readonly count: number;

    private readonly lifeByte: number;
    private readonly sizeInt16: number;
    private readonly colorFromInt32: number;
    private readonly colorToInt32: number;

    public constructor(posX: number, posY: number, offsetXInt16: number, offsetYInt16: number, count: number, speedInt16: number, life: number, size: number, colorFromInt32: number, colorToInt32: number) {
        this.posX = posX;
        this.posY = posY;
        this.offsetXInt16 = offsetXInt16;
        this.offsetYInt16 = offsetYInt16;
        this.count = count;
        this.speed = speedInt16;

        this.lifeByte = life;
        this.sizeInt16 = size;
        this.colorFromInt32 = colorFromInt32;
        this.colorToInt32 = colorToInt32;
    }

    public static create(posX: number, posY: number, offsetX: number, offsetY: number, count: number, speed: number, life: number, size: number, colorFrom: string, colorTo: string): ParticleS2CPacket {
        return new ParticleS2CPacket(
            posX,
            posY,
            encodeToInt16(offsetX),
            encodeToInt16(offsetY),
            count,
            speed,
            encodeToUnsignedByte(life),
            encodeToInt16(size),
            encodeColorHex(colorFrom),
            encodeColorHex(colorTo),
        );
    }

    public static read(reader: BinaryReader): ParticleS2CPacket {
        const posX = reader.readFloat();
        const posY = reader.readFloat();

        const offsetXInt16 = reader.readInt16();
        const offsetYInt16 = reader.readInt16();

        const count = reader.readUint8();
        const speed = reader.readFloat();

        const life = reader.readUint8();
        const size = reader.readInt16();
        const colorFromInt32 = reader.readUint32();
        const colorToInt32 = reader.readUint32();
        return new ParticleS2CPacket(posX, posY, offsetXInt16, offsetYInt16, count, speed, life, size, colorFromInt32, colorToInt32);
    }

    public static write(writer: BinaryWriter, value: ParticleS2CPacket): void {
        writer.writeFloat(value.posX);
        writer.writeFloat(value.posY);
        writer.writeInt16(value.offsetXInt16);
        writer.writeInt16(value.offsetYInt16);
        writer.writeInt8(value.count);
        writer.writeFloat(value.speed);
        writer.writeInt8(value.lifeByte);
        writer.writeInt16(value.sizeInt16);
        writer.writeUint32(value.colorFromInt32);
        writer.writeUint32(value.colorToInt32);
    }

    public getId(): PayloadId<any> {
        return ParticleS2CPacket.ID;
    }

    public get offsetX() {
        return decodeFromInt16(this.offsetXInt16);
    }

    public get offsetY() {
        return decodeFromInt16(this.offsetYInt16);
    }

    public get life() {
        return decodeFromUnsignedByte(this.lifeByte);
    }

    public get size() {
        return decodeFromInt16(this.sizeInt16);
    }

    public get colorFrom() {
        return decodeColorHex(this.colorFromInt32);
    }

    public get colorTo() {
        return decodeColorHex(this.colorToInt32);
    }
}