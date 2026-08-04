import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {
    decodeFromInt16,
    decodeFromUnsignedByte,
    encodeColorHex,
    encodeToInt16,
    encodeToUnsignedByte,
} from "../../../utils/NetUtil.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";
import type {HexColor} from "../../../type/types.ts";

export class ParticleS2CPacket implements Payload {
    public static readonly ID: PayloadType<ParticleS2CPacket> = payloadType('particle');
    public static readonly CODEC: PacketCodec<ParticleS2CPacket> = PacketCodecs.of(this.write, this.read);

    public readonly posX: number;
    public readonly posY: number;

    private readonly offsetXInt16: number;
    private readonly offsetYInt16: number;
    private offsetXCache: number | null = null;
    private offsetYCache: number | null = null;

    public readonly speed: number
    public readonly count: number;

    private readonly lifeByte: number;
    private lifeCache: number | null = null;

    private readonly sizeInt16: number;
    private sizeCache: number | null = null;

    private readonly colorFromInt32: number;
    private readonly colorToInt32: number;
    private color0: HexColor | null = null;
    private color1: HexColor | null = null;

    private constructor(
        posX: number, posY: number,
        offsetXInt16: number, offsetYInt16: number,
        count: number,
        speedInt16: number,
        life: number,
        size: number,
        colorFromInt32: number, colorToInt32: number
    ) {
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

    public static create(
        posX: number, posY: number,
        offsetX: number, offsetY: number,
        count: number,
        speed: number,
        life: number,
        size: number,
        colorFrom: HexColor, colorTo: HexColor
    ): ParticleS2CPacket {
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

    public type(): PayloadType<any> {
        return ParticleS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onParticle(this);
    }

    public get offsetX(): number {
        if (this.offsetXCache === null) {
            this.offsetXCache = decodeFromInt16(this.offsetXInt16);
        }
        return this.offsetXCache;
    }

    public get offsetY(): number {
        if (this.offsetYCache === null) {
            this.offsetYCache = decodeFromInt16(this.offsetYInt16);
        }
        return this.offsetYCache;
    }

    public get life(): number {
        if (this.lifeCache === null) {
            this.lifeCache = decodeFromUnsignedByte(this.lifeByte);
        }
        return this.lifeCache;
    }

    public get size(): number {
        if (this.sizeCache === null) {
            this.sizeCache = decodeFromInt16(this.sizeInt16);
        }
        return this.sizeCache;
    }

    public get colorFrom(): HexColor {
        if (this.color0 === null) {
            this.color0 = `#${this.colorFromInt32.toString(16)}`;
        }
        return this.color0;
    }

    public get colorTo(): HexColor {
        if (this.color1 === null) {
            this.color1 = `#${this.colorToInt32.toString(16)}`;
        }
        return this.color1;
    }
}