import type {VisualEffectType} from "./VisualEffectType.ts";

export interface VisualEffect {
    getType(): VisualEffectType<any>;

    isAlive(): boolean;

    tick(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D, tickDelta: number): void;

    kill(): void;
}
