import {SectionPos} from "./SectionPos.ts";

export class MutSectionPos extends SectionPos {
    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        super(Math.floor(x), Math.floor(y));
        this.x = x;
        this.y = y;
    }

    public static zero() {
        return new MutSectionPos(0, 0);
    }

    public set(x: number, y: number) {
        this.x = Math.floor(x);
        this.y = Math.floor(y);
    }
}