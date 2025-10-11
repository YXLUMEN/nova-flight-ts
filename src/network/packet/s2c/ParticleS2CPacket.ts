import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import {decodeFromInt16, decodeFromUnsignedByte, encodeToInt16, encodeToUnsignedByte} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ParticleS2CPacket implements Payload {
    public static readonly ID: PayloadId<ParticleS2CPacket> = {id: Identifier.ofVanilla('particle')};
    public static readonly CODEC: PacketCodec<ParticleS2CPacket> = PacketCodecs.of(this.write, this.read);

    public readonly posX: number;
    public readonly posY: number;
    private readonly offsetXInt16: number;
    private readonly offsetYInt16: number;
    private readonly speedInt16: number
    public readonly count: number;

    private readonly lifeByte: number;
    private readonly sizeInt16: number;
    public readonly colorFrom: string;
    public readonly colorTo: string;

    public constructor(posX: number, posY: number, offsetXInt16: number, offsetYInt16: number, count: number, speedInt16: number, life: number, size: number, colorFrom: string, colorTo: string) {
        this.posX = posX;
        this.posY = posY;
        this.offsetXInt16 = offsetXInt16;
        this.offsetYInt16 = offsetYInt16;
        this.count = count;
        this.speedInt16 = speedInt16;

        this.lifeByte = life;
        this.sizeInt16 = size;
        this.colorFrom = colorFrom;
        this.colorTo = colorTo;
    }

    public static create(posX: number, posY: number, offsetX: number, offsetY: number, count: number, speed: number, life: number, size: number, colorFrom: string, colorTo: string): ParticleS2CPacket {
        return new this(
            posX,
            posY,
            encodeToInt16(offsetX),
            encodeToInt16(offsetY),
            count,
            encodeToInt16(speed),
            encodeToUnsignedByte(life),
            encodeToInt16(size),
            colorFrom,
            colorTo,
        );
    }

    public static read(reader: BinaryReader): ParticleS2CPacket {
        const posX = reader.readDouble();
        const posY = reader.readDouble();

        const offsetXInt16 = reader.readInt16();
        const offsetYInt16 = reader.readInt16();

        const count = reader.readUnsignByte();
        const speed = reader.readInt16();

        const life = reader.readUnsignByte();
        const size = reader.readInt16();
        const colorFrom = reader.readString();
        const colorTo = reader.readString();
        return new ParticleS2CPacket(posX, posY, offsetXInt16, offsetYInt16, count, speed, life, size, colorFrom, colorTo);
    }

    public static write(writer: BinaryWriter, value: ParticleS2CPacket): void {
        writer.writeDouble(value.posX);
        writer.writeDouble(value.posY);
        writer.writeInt16(value.offsetXInt16);
        writer.writeInt16(value.offsetYInt16);
        writer.writeByte(value.count);
        writer.writeInt16(value.speedInt16);
        writer.writeByte(value.lifeByte);
        writer.writeInt16(value.sizeInt16);
        writer.writeString(value.colorFrom);
        writer.writeString(value.colorTo);
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

    public get speed() {
        return decodeFromInt16(this.speedInt16);
    }

    public get life() {
        return decodeFromUnsignedByte(this.lifeByte);
    }

    public get size() {
        return decodeFromInt16(this.sizeInt16);
    }
}