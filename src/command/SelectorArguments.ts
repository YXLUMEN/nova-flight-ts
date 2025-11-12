import type {Entity} from "../entity/Entity.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";

export interface SelectorArguments {
    limit?: number;
}

export type EntityFilter = (entity: Entity, source: ServerCommandSource) => boolean;

export type ParsedSelector = { base: string, args: SelectorArguments, filters: EntityFilter[] };
