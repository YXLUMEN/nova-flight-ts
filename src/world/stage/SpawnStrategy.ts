import type {MobFactory} from "../../type/IStage.ts";
import {randInt, randomFromIterator} from "../../utils/math/math.ts";
import {MobBlueprint} from "./MobBlueprint.ts";
import {World} from "../World.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import {SpawnMarkerEntity} from "../../entity/SpawnMarkerEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {ExplosionEntity} from "../../entity/ExplosionEntity.ts";
import {MutAABB} from "../../utils/math/MutAABB.ts";

export function spawnAtTop(bp: MobBlueprint): MobFactory {
    return (ctx) => {
        const x = randInt(24, World.MAP_WIDTH - 24);
        const mob = bp.create(ctx);
        mob.setPosition(x, -30);
        return mob;
    };
}

export function spawnAtTopBest(
    bp: MobBlueprint,
    candidates: number = 8,
    history: number = 16,
    minGap: number = 64,
    margin: number = 24
): MobFactory {
    candidates = Math.max(2, candidates);
    history = Math.max(1, history);
    minGap = Math.max(0, minGap);

    const recent: number[] = [];

    function sampleX(minX: number, maxX: number): number {
        if (maxX <= minX) return minX;
        if (recent.length === 0) {
            const x0 = randInt(minX, maxX);
            recent.push(x0);
            return x0;
        }
        let bestX = minX;
        let bestScore = -Infinity;
        for (let c = 0; c < candidates; c++) {
            const x = randInt(minX, maxX);
            let d = Infinity;
            for (let i = 0; i < recent.length; i++) {
                const dx = Math.abs(x - recent[i]);
                d = Math.min(d, dx);
                if (d === 0) break;
            }
            // 轻微偏向 minGap 附近
            const score = d - Math.abs(d - minGap) * 0.01;
            if (score > bestScore) {
                bestScore = score;
                bestX = x;
            }
        }
        recent.push(bestX);
        if (recent.length > history) recent.shift();
        return bestX;
    }

    return (ctx) => {
        const x = sampleX(margin, World.MAP_WIDTH - margin);
        const mob = bp.create(ctx);
        mob.setPosition(x, -30);
        return mob;
    };
}

export function spawnAtTopLine(
    bp: MobBlueprint,
    count: number,
    gap: number = 48,
    startY: number = -30,
): MobFactory {
    return (ctx) => {
        const totalWidth = gap * (count - 1);
        const startX = randInt(24, World.MAP_WIDTH - 24 - totalWidth);
        const arr: MobEntity[] = [];

        for (let i = 0; i < count; i++) {
            const mob = bp.create(ctx);
            mob.setPosition(startX + i * gap, startY);
            arr.push(mob);
        }
        return arr;
    };
}

export function spawnFormation(members: MobBlueprint[]): MobFactory {
    return (ctx) => {
        const arr: MobEntity[] = [];
        const baseX = randInt(24, World.MAP_WIDTH - 24);

        for (let i = 0; i < members.length; i++) {
            const bp = members[i];
            const mob = bp.create(ctx);
            mob.setPosition(baseX, i + 16 + mob.getHeight());
            arr.push(mob);
        }
        return arr;
    };
}


export function spawnInMap(bp: MobBlueprint, margin: number = 24, safeRadius: number = 128): MobFactory {
    const {halfWidth, halfHeight} = bp.type.getDimensions();
    const safeRadiusSq = safeRadius * safeRadius;
    const blockMinX = Math.ceil(margin / 8);
    const blockMaxX = Math.floor((World.MAP_WIDTH - margin) / 8) - 1;
    const blockMinY = Math.ceil(margin / 8);
    const blockMaxY = Math.floor((World.MAP_HEIGHT - margin) / 8) - 1;

    return (ctx) => {
        const blockMap = ctx.world.getMap();
        const players = ctx.world.getPlayers();
        const candidateAABB = new MutAABB(0, 0);
        let x = 0, y = 0;
        for (let tries = 0; tries < 100; tries++) {
            const bx = randInt(blockMinX, blockMaxX);
            const by = randInt(blockMinY, blockMaxY);
            x = bx * 8 + 4;
            y = by * 8 + 4;
            // 避开玩家
            let tooClose = false;
            for (const p of players) {
                const pos = p.positionRef;
                if ((x - pos.x) ** 2 + (y - pos.y) ** 2 < safeRadiusSq) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;
            // 避开障碍物
            candidateAABB.set(
                x - halfWidth, y - halfHeight,
                x + halfWidth, y + halfHeight,
            );
            if (blockMap.intersectsBox(candidateAABB)) continue;
            break;
        }
        const mob = bp.create(ctx);
        mob.setPosition(x, y);
        const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, ctx.world, mob);
        mark.setPosition(x, y);
        return mark;
    };
}


export function spawnExplosion(): MobFactory {
    return (ctx) => {
        const player = randomFromIterator(ctx.world.getPlayers());
        if (!player) return null;

        const explosion = new ExplosionEntity(EntityTypes.EXPLOSION_ENTITY, ctx.world);
        explosion.setPositionByVec(player.positionRef);
        return explosion;
    };
}