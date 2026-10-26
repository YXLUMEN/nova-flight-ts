import type {VisualEffectType} from "./VisualEffectType.ts";
import type {ViewRect} from "../client/render/Camera.ts";

export interface VisualEffect {
    getType(): VisualEffectType<any>;

    tick(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D, alpha: number): void;

    shouldRender(view: ViewRect): boolean;

    isAlive(): boolean;

    kill(): void;
}
