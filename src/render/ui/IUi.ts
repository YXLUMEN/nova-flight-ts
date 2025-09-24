export interface IUi {
    tick?(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D): void;

    setSize(w: number, h: number): void;

    destroy(): void;
}