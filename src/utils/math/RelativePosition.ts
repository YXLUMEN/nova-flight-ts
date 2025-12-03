export class RelativePosition {
    public static readonly ZERO_LOCAL = new RelativePosition('^', '^');
    public static readonly ZERO_WORLD = new RelativePosition('~', '~');

    public readonly x: string;
    public readonly y: string;

    public constructor(x: string, y: string) {
        this.x = x;
        this.y = y;
    }
}