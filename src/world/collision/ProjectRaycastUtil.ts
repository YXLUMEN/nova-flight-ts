import type {World} from "../World.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {Predicate} from "../../type/types.ts";
import type {HitResult} from "./HitResult.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import {squareDistVec2} from "../../utils/math/math.ts";
import {EntityHitResult} from "./EntityHitResult.ts";

export class ProjectRaycastUtil {
    public static getCollision(entity: Entity, predicate: Predicate<Entity>, margin: number = 0.3): HitResult {
        const velocity = entity.velocityRef;
        const world = entity.getWorld();
        const pos = entity.position();

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

        return entityHit === null ? blockHit : entityHit;
    }

    public static getEntityCollision(
        world: World,
        except: Entity,
        min: Vec2,
        max: Vec2,
        box: AABB,
        predicate: Predicate<Entity>,
        margin: number = 0
    ): EntityHitResult | null {
        let hit: Vec2 | null = null;
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