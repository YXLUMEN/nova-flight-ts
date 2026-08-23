import type {Entity} from "../../../entity/Entity.ts";

export interface EntityRenderer<T extends Entity> {
    render(entity: T, ctx: CanvasRenderingContext2D, alpha: number): void;

    clearCache?(): void;
}