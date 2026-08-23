import type {SpawnMarkerEntity} from "../entity/SpawnMarkerEntity.ts";
import type {SpawnContext} from "../world/stage/SpawnContext.ts";
import type {Entity} from "../entity/Entity.ts";

export type MobFactory = (ctx: SpawnContext) => Entity | Entity[] | SpawnMarkerEntity | SpawnMarkerEntity[] | null;