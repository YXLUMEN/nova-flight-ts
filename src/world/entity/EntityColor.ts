// 临时方案
import type {HexColor} from "../../type/types.ts";
import {decodeColorToHex, encodeColorHex} from "../../utils/net_util.ts";

export class EntityColor {
    private colorStr: HexColor;
    private edgeColor: HexColor;

    private colorHex: number;
    private edgeColorHex: number;

    public constructor(color: HexColor, edgeColor?: HexColor) {
        this.colorStr = color;
        this.edgeColor = edgeColor ?? '#00000000';

        this.colorHex = encodeColorHex(color);
        this.edgeColorHex = edgeColor ? encodeColorHex(edgeColor) : 0;
    }

    public static default() {
        return new EntityColor('#fff');
    }

    public get color() {
        return this.colorStr;
    }

    public set color(value: HexColor) {
        this.colorHex = encodeColorHex(value);
        this.colorStr = value;
    }

    public get edge() {
        return this.edgeColor;
    }

    public set edge(value: HexColor) {
        this.edgeColorHex = encodeColorHex(value);
        this.edgeColor = value;
    }

    public get hex() {
        return this.colorHex;
    }

    public set hex(value: number) {
        this.colorStr = decodeColorToHex(value);
        this.colorHex = value;
    }

    public get edgeHex() {
        return this.edgeColorHex;
    }

    public set edgeHex(value: number) {
        this.edgeColor = decodeColorToHex(value);
        this.edgeColorHex = value;
    }
}