import {distanceVec2} from "../utils/math/math.ts";
import type {EntityFilter} from "./SelectorArguments.ts";
import type {Entity} from "../entity/Entity.ts";
import type {BiConsumer} from "../apis/types.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {shuffleArray} from "../utils/uit.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";


export class EntitySelector {
    public static readonly ARBITRARY: BiConsumer<IVec, Entity[]> = () => {
    };
    public static readonly NEAREST: BiConsumer<IVec, Entity[]> = (pos, entities) => {
        entities.sort((e1, e2) => {
            return distanceVec2(e1.getPositionRef, pos) - distanceVec2(e2.getPositionRef, pos)
        });
    };
    public static readonly FURTHEST: BiConsumer<IVec, Entity[]> = (pos, entities) => {
        entities.sort((e1, e2) => {
            return distanceVec2(e2.getPositionRef, pos) - distanceVec2(e1.getPositionRef, pos)
        });
    };
    public static readonly RANDOM: BiConsumer<IVec, Entity[]> = (_, entities) => {
        shuffleArray(entities);
    };

    public readonly limit: number;
    public readonly includesNonPlayers: boolean;
    public readonly senderOnly: boolean;
    private readonly filters: EntityFilter[];
    private readonly sorter: BiConsumer<IVec, Entity[]>;

    public constructor(
        limit: number,
        includesNonPlayers: boolean,
        filters: EntityFilter[],
        sorter: BiConsumer<IVec, Entity[]>,
        senderOnly: boolean,
    ) {
        this.limit = limit;
        this.includesNonPlayers = includesNonPlayers;
        this.filters = filters;
        this.sorter = sorter;
        this.senderOnly = senderOnly;
    }

    private checkSourcePermission(source: ServerCommandSource) {
        if (!source.hasPermissionLevel(6)) {
            throw new Error('Not allowed permission level');
        }
    }

    public getEntity(source: ServerCommandSource): Entity | null {
        this.checkSourcePermission(source);
        return this.getEntitiesIter(source).next().value ?? null;
    }

    public getEntities(source: ServerCommandSource): Entity[] {
        const entities = this.getEntitiesIter(source).toArray();
        return this.findEntities(source.position, entities);
    }

    private* getEntitiesIter(source: ServerCommandSource) {
        this.checkSourcePermission(source);
        if (this.senderOnly && source.entity !== null) {
            yield source.entity;
            return;
        }

        const world = source.getWorld();
        if (!world) {
            return;
        }

        const limit = this.getAppendLimit();
        if (!this.includesNonPlayers) {
            let i = 0;
            for (const player of world.getPlayers()) {
                if (!this.filters.every(f => f(player, source))) continue;
                if (i >= limit) break;
                i++;
                yield player;
            }
            return;
        }

        let i = 0;
        for (const entity of world.getEntities().values()) {
            if (!this.filters.every(f => f(entity, source))) continue;
            if (i >= limit) break;
            i++;
            yield entity;
        }
    }

    private getAppendLimit() {
        return this.sorter == EntitySelector.ARBITRARY ? this.limit : Number.MAX_SAFE_INTEGER;
    }

    private findEntities(pos: IVec, entities: Entity[]) {
        if (entities.length > 0) {
            this.sorter(pos, entities);
        }

        return entities.slice(0, Math.min(this.limit, entities.length));
    }
}