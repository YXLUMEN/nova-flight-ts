export interface IEffect {
    isAlive(): boolean;

    tick(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D, tickDelta: number): void;

    kill(): void;
}
