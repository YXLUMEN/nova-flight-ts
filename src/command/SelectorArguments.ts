import type {Entity} from "../entity/Entity.ts";

export interface SelectorArguments {
    limit?: number;
}

export type EntityFilter = (entity: Entity) => boolean;

export type ParsedSelector = { base: string, args: SelectorArguments, filters: EntityFilter[] };
