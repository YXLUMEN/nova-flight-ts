import type {IUi} from "./IUi.ts";

export abstract class UiFramework implements IUi {
    protected width: number = 0;
    protected height: number = 0;

    protected halfW: number = 0;
    protected halfH: number = 0;

    public abstract render(ctx: CanvasRenderingContext2D, tickDelta: number): void;

    public setSize(w: number, h: number): void {
        this.width = Math.max(0, w);
        this.height = Math.max(0, h);

        this.halfW = this.width / 2;
        this.halfH = this.height / 2;
    }

    public abstract destroy(reason?: string): void ;
}