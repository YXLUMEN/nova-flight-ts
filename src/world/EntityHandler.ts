import type {Entity} from "../entity/Entity.ts";

export interface EntityHandler<T extends Entity> {
    startTicking(entity: T): void;

    stopTicking(entity: T): void;
}