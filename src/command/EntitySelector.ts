import {squareDistVec2} from "../utils/math/math.ts";
import type {EntityFilter} from "./SelectorArguments.ts";
import type {Entity} from "../entity/Entity.ts";
import type {BiConsumer, UUID} from "../type/types.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {AABB} from "../utils/math/AABB.ts";
import {NumberRange, type NumRange} from "../world/predicate/NumberRange.ts";
import {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {EntitySelectorReader} from "./EntitySelectorReader.ts";
import type {Vec2} from "../utils/math/Vec2.ts";


export class EntitySelector {
    public readonly limit: number;
    public readonly includesNonPlayers: boolean;
    public readonly senderOnly: boolean;
    public readonly sqrtDistance: NumRange;
    public readonly box: AABB | null;
    public readonly playerName: string | null;
    public readonly uuid: UUID | null;
    public readonly useAt: boolean;

    private readonly filters: EntityFilter[];
    private readonly sorter: BiConsumer<Vec2, Entity[]>;

    public constructor(
        limit: number,
        includesNonPlayers: boolean,
        filters: EntityFilter[],
        sqrtDistance: NumRange,
        box: AABB | null,
        sorter: BiConsumer<Vec2, Entity[]>,
        senderOnly: boolean,
        playerName: string | null,
        uuid: UUID | null,
        useAt: boolean
    ) {
        this.limit = limit;
        this.includesNonPlayers = includesNonPlayers;
        this.sqrtDistance = sqrtDistance;
        this.box = box;
        this.filters = filters;
        this.sorter = sorter;
        this.senderOnly = senderOnly;
        this.playerName = playerName;
        this.uuid = uuid;
        this.useAt = useAt;
    }

    private checkSourcePermission(source: ServerCommandSource) {
        if (this.useAt && !source.hasPermissionLevel(6)) {
            throw new Error('Not allowed permission level');
        }
    }

    public getEntity(source: ServerCommandSource): Entity {
        this.checkSourcePermission(source);
        const entities = this.getEntities(source);
        if (entities.length === 0) {
            throw EntitySelectorArgumentType.ENTITY_NOT_FOUND_EXCEPTION;
        }
        if (entities.length > 1) {
            throw EntitySelectorArgumentType.TOO_MANY_ENTITIES;
        }
        return entities[0];
    }

    public getEntities(source: ServerCommandSource): Entity[] {
        this.checkSourcePermission(source);
        if (!this.includesNonPlayers) {
            return this.getPlayers(source);
        }

        if (this.playerName !== null) {
            const player = source.server.playerManager.getPlayerByName(this.playerName);
            return player === null ? [] : [player];
        }

        if (this.uuid !== null) {
            const entity = source.server.world!.getEntity(this.uuid);
            return entity === null ? [] : [entity];
        }

        const box = this.box !== null ? this.box.offsetByVec(source.position) : null;
        const filters = this.getPositionFilters(source.position, box);

        if (this.senderOnly) {
            const entity = source.entity;
            return entity !== null && filters.every(f => f(entity)) ? [entity] : [];
        }

        const limit = this.getAppendLimit();
        const candidates: Entity[] = [];

        for (const entity of source.server.world!.getEntities().values()) {
            if (!filters.every(f => f(entity))) continue;
            candidates.push(entity);
            if (candidates.length >= limit) break;
        }

        return this.findEntities(source.position, candidates);
    }

    public getPlayer(source: ServerCommandSource): PlayerEntity {
        this.checkSourcePermission(source);
        const players = this.getPlayers(source);
        if (players.length !== 1) {
            throw EntitySelectorArgumentType.PLAYER_NOT_FOUND_EXCEPTION;
        }
        return players[0];
    }

    public getPlayers(source: ServerCommandSource): ServerPlayerEntity[] {
        this.checkSourcePermission(source);
        if (this.playerName !== null) {
            const player = source.server.playerManager.getPlayerByName(this.playerName);
            return player === null ? [] : [player];
        }

        if (this.uuid !== null) {
            const player = source.server.playerManager.getPlayer(this.uuid);
            return player === null ? [] : [player];
        }

        const box = this.box !== null ? this.box.offsetByVec(source.position) : null;
        const filters = this.getPositionFilters(source.position, box);

        if (this.senderOnly) {
            const player = source.entity;
            return player instanceof ServerPlayerEntity &&
            filters.every(f => f(player)) ?
                [player] : [];
        }

        const limit = this.getAppendLimit();
        const results: ServerPlayerEntity[] = [];

        for (const player of source.server.playerManager.getAllPlayers()) {
            if (!filters.every(f => f(player))) continue;
            results.push(player);
            if (results.length >= limit) break;
        }

        return results;
    }

    private getPositionFilters(pos: Vec2, box: AABB | null) {
        const hasBox = box !== null;
        const hasDistance = this.sqrtDistance[0] !== null && this.sqrtDistance[1] !== null;

        if (!hasBox && !hasDistance) {
            return this.filters;
        }

        const filters = Array.from(this.filters);
        if (hasBox) {
            filters.push(entity => box.intersectsByBox(entity.getBoundingBox()));
        }
        if (hasDistance) {
            filters.push(entity => NumberRange.test(this.sqrtDistance, squareDistVec2(entity.positionRef, pos)));
        }

        return filters;
    }

    private getAppendLimit() {
        return this.sorter == EntitySelectorReader.ARBITRARY ? this.limit : Number.MAX_SAFE_INTEGER;
    }

    private findEntities(pos: Vec2, entities: Entity[]) {
        if (entities.length > 0) {
            this.sorter(pos, entities);
        }

        return entities.slice(0, Math.min(this.limit, entities.length));
    }
}