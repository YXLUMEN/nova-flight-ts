export interface Effect {
    isAlive(): boolean;

    tick(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D): void;

    kill(): void;
}
