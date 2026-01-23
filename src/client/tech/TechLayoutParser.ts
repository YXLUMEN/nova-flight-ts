export class TechLayoutParser {
    private readonly originX: number;
    private readonly originY: number;
    private readonly xOffset: number;
    private readonly yOffset: number;

    public constructor(originX: number, originY: number, xOffset: number, yOffset: number) {
        this.originX = originX;
        this.originY = originY;
        this.xOffset = xOffset;
        this.yOffset = yOffset;
    }

    public parse(x: number, y: number) {
        const px = Math.round(this.originX + x * this.xOffset);
        const py = Math.round(this.originY + y * this.yOffset);

        return {x: px, y: py};
    }
}