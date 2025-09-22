export interface IUi {
    tick?(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D): void;

    setWorldSize(w: number, h: number): void;

    destroy(): void;
}