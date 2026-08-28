import type {VisualEffectType} from "./VisualEffectType.ts";

export interface VisualEffect {
    getType(): VisualEffectType<any>;

    tick(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D, alpha: number): void;

    isAlive(): boolean;

    kill(): void;
}
