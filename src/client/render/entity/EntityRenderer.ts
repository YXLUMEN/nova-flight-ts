import type {Entity} from "../../../entity/Entity.ts";

export interface EntityRenderer<T extends Entity> {
    render(entity: T, ctx: CanvasRenderingContext2D, offsetX?: number, offsetY?: number): void;
}