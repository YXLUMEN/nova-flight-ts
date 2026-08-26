// 临时方案
import type {HexColor} from "../../type/types.ts";
import {decodeColorToHex, encodeColorHex} from "../../utils/NetUtil.ts";

export class EntityColor {
    private color_: HexColor;
    private edgeColor: HexColor;

    private hex_: number;
    private edgeHex_: number;

    public constructor(color: HexColor, edgeColor?: HexColor) {
        this.color_ = color;
        this.edgeColor = edgeColor ?? '#00000000';

        this.hex_ = encodeColorHex(color);
        this.edgeHex_ = edgeColor ? encodeColorHex(edgeColor) : 0;
    }

    public static default() {
        return new EntityColor('#fff');
    }

    public get color() {
        return this.color_;
    }

    public set color(value: HexColor) {
        this.hex_ = encodeColorHex(value);
        this.color_ = value;
    }

    public get edge() {
        return this.edgeColor;
    }

    public set edge(value: HexColor) {
        this.edgeHex_ = encodeColorHex(value);
        this.edgeColor = value;
    }

    public get hex() {
        return this.hex_;
    }

    public set hex(value: number) {
        this.color_ = decodeColorToHex(value);
        this.hex_ = value;
    }

    public get edgeHex() {
        return this.edgeHex_;
    }

    public set edgeHex(value: number) {
        this.edgeColor = decodeColorToHex(value);
        this.edgeHex_ = value;
    }
}