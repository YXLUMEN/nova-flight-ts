import type {VisualEffect} from "../../effect/VisualEffect.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {decodeFromUnsignedByte, encodeToUnsignedByte} from "../../utils/NetUtil.ts";

export class ExplosionVisual {
    public static readonly CODEC: PacketCodec<ExplosionVisual> = PacketCodecs.of(
        (writer, value) => {
            const flag = value.modifiedFlag();
            writer.writeVarUint(flag);

            if (flag & 1 << 0) writer.writeFloat(value.radius);
            if (flag & 1 << 1) PacketCodecs.COLOR_HEX.encode(writer, value.color);
            if (flag & 1 << 2) writer.writeInt8(value.sparks);
            if (flag & 1 << 3) writer.writeInt8(value.fastSparks);
            if (flag & 1 << 4) writer.writeBoolean(value.ring);
            if (flag & 1 << 5) writer.writeInt8(encodeToUnsignedByte(value.shake, 1));
            if (flag & 1 << 6) writer.writeBoolean(value.important);
            if (flag & 1 << 7) writer.writeBoolean(value.screenFlash);
        },
        reader => {
            const modified = reader.readInt8();
            const visual = new ExplosionVisual();
            if (modified & 1 << 0) visual.radius = reader.readFloat();
            if (modified & 1 << 1) visual.color = PacketCodecs.COLOR_HEX.decode(reader);
            if (modified & 1 << 2) visual.sparks = reader.readInt8();
            if (modified & 1 << 3) visual.fastSparks = reader.readInt8();
            if (modified & 1 << 4) visual.ring = reader.readBoolean();
            if (modified & 1 << 5) visual.shake = decodeFromUnsignedByte(reader.readUint8(), 1);
            if (modified & 1 << 6) visual.important = reader.readBoolean();
            if (modified & 1 << 7) visual.screenFlash = reader.readBoolean();
            return visual;
        }
    );

    public radius: number;
    public color: string;
    // 视觉半径
    public ring: boolean;
    public flash?: VisualEffect;
    public screenFlash: boolean;
    // 摄像机震动强度
    public shake: number;
    // 火花数量
    public sparks: number;
    public fastSparks: number;
    public important: boolean;

    public constructor(
        radius: number = 96,
        color: string = '#e3e3e3',
        sparks: number = 8,
        fastSparks: number = 4,
        ring: boolean = true,
        shake: number = 0,
        important: boolean = false,
        screenFlash: boolean = false,
        flash?: VisualEffect,
    ) {
        this.radius = radius;
        this.color = color;
        this.ring = ring;
        this.shake = shake;
        this.sparks = sparks;
        this.fastSparks = fastSparks;
        this.important = important;
        this.screenFlash = screenFlash;
        this.flash = flash;
    }

    public modifiedFlag(): number {
        let flag = 0;
        if (this.radius !== 96) flag |= 1 << 0;
        if (this.color !== '#e3e3e3') flag |= 1 << 1;
        if (this.sparks !== 8) flag |= 1 << 2;
        if (this.fastSparks !== 4) flag |= 1 << 3;
        if (!this.ring) flag |= 1 << 4;
        if (this.shake !== 0) flag |= 1 << 5;
        if (this.important) flag |= 1 << 6;
        if (this.screenFlash) flag |= 1 << 7;
        if (this.flash) flag |= 1 << 8;
        return flag;
    }
}
