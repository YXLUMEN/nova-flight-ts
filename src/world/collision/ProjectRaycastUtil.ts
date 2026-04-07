import type {BlockRaycastResult} from "./BlockRaycastResult.ts";
import {BitBlockMap} from "../map/BitBlockMap.ts";
import type {World} from "../World.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {Predicate} from "../../type/types.ts";
import {EntityHitResult} from "./EntityHitResult.ts";
import {squareDistVec2} from "../../utils/math/math.ts";
import type {HitResult} from "./HitResult.ts";

export class ProjectRaycastUtil {
    public static raycast(
        map: BitBlockMap,
        startX: number,
        startY: number,
        endX: number,
        endY: number
    ): BlockRaycastResult {
        const tileSize = BitBlockMap.BLOCK_SIZE;
        const power = BitBlockMap.POWER;

        const dx = endX - startX;
        const dy = endY - startY;

        const stepX = dx >= 0 ? 1 : -1;
        const stepY = dy >= 0 ? 1 : -1;

        let gridX = startX >> power;
        let gridY = startY >> power;

        const targetGridX = endX >> power;
        const targetGridY = endY >> power;

        if (map.get(gridX, gridY) !== 0) {
            return {hit: true, t: 0, gridX, gridY, normalX: 0, normalY: 0};
        }

        let sideDistX: number;
        let sideDistY: number;

        if (dx === 0) {
            sideDistX = Infinity;
        } else {
            const nextBoundaryX = stepX > 0 ? (gridX + 1) * tileSize : gridX * tileSize;
            sideDistX = (nextBoundaryX - startX) / dx;
        }

        if (dy === 0) {
            sideDistY = Infinity;
        } else {
            const nextBoundaryY = stepY > 0 ? (gridY + 1) * tileSize : gridY * tileSize;
            sideDistY = (nextBoundaryY - startY) / dy;
        }

        const deltaDistX = dx === 0 ? Infinity : Math.abs(tileSize / dx);
        const deltaDistY = dy === 0 ? Infinity : Math.abs(tileSize / dy);

        const maxSteps = Math.ceil(Math.abs(targetGridX - gridX) + Math.abs(targetGridY - gridY)) + 2;

        let currentGridX = gridX;
        let currentGridY = gridY;
        let currentSideDistX = sideDistX;
        let currentSideDistY = sideDistY;

        for (let i = 0; i < maxSteps; i++) {
            let tNext: number;
            let normalX = 0;
            let normalY = 0;

            if (currentSideDistX < currentSideDistY) {
                tNext = currentSideDistX;
                currentSideDistX += deltaDistX;
                currentGridX += stepX;
                normalX = -stepX;
                normalY = 0;
            } else {
                tNext = currentSideDistY;
                currentSideDistY += deltaDistY;
                currentGridY += stepY;
                normalX = 0;
                normalY = -stepY;
            }

            if (tNext > 1.0) {
                return {hit: false, t: 1, gridX: -1, gridY: -1, normalX: 0, normalY: 0};
            }

            if (map.get(currentGridX, currentGridY) !== 0) return {
                hit: true,
                t: tNext,
                gridX: currentGridX,
                gridY: currentGridY,
                normalX: normalX,
                normalY: normalY
            };

        }

        return {hit: false, t: 1, gridX: -1, gridY: -1, normalX: 0, normalY: 0};
    }

    public static getCollision(entity: Entity, predicate: Predicate<Entity>, margin: number = 0.3): HitResult {
        const velocity = entity.getVelocityRef;
        const world = entity.getWorld();
        const pos = entity.getPosition();

        let futurePos = pos.addVec(velocity);
        const blockHit = world.raycast(pos, futurePos);
        if (!blockHit.missed) {
            futurePos = blockHit.pos;
        }

        const entityHit = this.getEntityCollision(
            world,
            entity,
            pos,
            futurePos,
            entity.getBoundingBox().stretchByVec(velocity).expandAll(1),
            predicate,
            margin
        );
        if (entityHit) {
            return entityHit;
        }
        return blockHit;
    }

    public static getEntityCollision(
        world: World,
        except: Entity,
        min: IVec,
        max: IVec,
        box: AABB,
        predicate: Predicate<Entity>,
        margin: number = 0
    ): EntityHitResult | null {
        let hit: IVec | null = null;
        let dist = Infinity;
        let candidate: Entity | null = null;

        for (const entity of world.searchOtherEntities(except, box, predicate)) {
            const targetBox = entity.getBoundingBox().expandAll(margin);
            if (targetBox.containsVec(min)) {
                return EntityHitResult.create(entity);
            }

            hit = targetBox.raycast(min, max);
            if (!hit) continue;

            const sqDist = squareDistVec2(min, hit);
            if (sqDist < dist) {
                candidate = entity;
                dist = sqDist;
            }
        }

        return candidate === null ? null : hit === null ? EntityHitResult.create(candidate) : new EntityHitResult(hit, candidate);
    }
}