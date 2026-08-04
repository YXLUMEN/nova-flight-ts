import {Stage} from "../world/stage/Stage.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {createPhase} from "../world/stage/PhaseConfig.ts";
import {
    spawnAtTop,
    spawnAtTopBest,
    spawnAtTopLine,
    spawnExplosion,
    spawnFormation,
    spawnInMap
} from "../world/stage/SpawnStrategy.ts";
import {MobBlueprintBuilder} from "../world/stage/MobBlueprint.ts";

const B = EntityTypes.BASE_ENEMY;
const G = EntityTypes.GUN_ENEMY_ENTITY;
const T = EntityTypes.TANK_ENEMY_ENTITY;
const M = EntityTypes.MISSILE_ENEMY_ENTITY;
const MG = EntityTypes.MINIGUN_ENEMY_ENTITY;

const p0 = createPhase({
    name: "P0",
    ticks: 60,
    rules: []
});

const p1 = createPhase({
    name: "P1",
    ticks: 2400,
    until: ({score}) => score >= 64,
    rules: [
        {
            every: 20,
            jitter: 0.3,
            factory: spawnAtTop(
                MobBlueprintBuilder
                    .of(B)
                    .speed(1.5)
                    .build()
            ),
            cap: 48
        },
    ],
});

const p2 = createPhase({
    name: "P2",
    until: ({score}) => score >= 200,
    rules: [
        {
            every: 20,
            jitter: 0.3,
            factory: spawnAtTop(
                MobBlueprintBuilder.of(B)
                    .speed(1.5)
                    .bonusHp(2)
                    .worth(4)
                    .build()
            ),
            cap: 16
        },
        {
            every: 40,
            jitter: 0.2,
            factory: spawnAtTopLine(
                MobBlueprintBuilder.of(B)
                    .speed(1.8)
                    .worth(2)
                    .build(),
                4, 56
            ),
            cap: 48
        },
    ],
});

const p3 = createPhase({
    name: "P3",
    until: ({score}) => score >= 512,
    rules: [
        {
            every: 20,
            jitter: 0.4,
            factory: spawnAtTop(
                MobBlueprintBuilder.of(B)
                    .speed(1.6)
                    .bonusHp(2)
                    .worth(6)
                    .color('#ff2121')
                    .build()
            ),
            cap: 64,
        },
        {
            every: 40,
            jitter: 0.5,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(G)
                    .speed(1.5)
                    .bonusHp(1)
                    .worth(4)
                    .build()
            ),
            cap: 24
        },
        {
            every: 45,
            jitter: 0.35,
            factory: spawnAtTopLine(
                MobBlueprintBuilder.of(B)
                    .speed(1.9)
                    .worth(2)
                    .build(),
                4, 64
            ),
            cap: 48
        },
    ],
});

const p4 = createPhase({
    name: "P4",
    until: ({score}) => score >= 1024,
    rules: [
        {
            every: 22,
            jitter: 0.4,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(B)
                    .speed(1.3)
                    .bonusHp(4)
                    .worth(8)
                    .color('#c10000')
                    .build()
            ),
            cap: 64,
        },
        {
            every: 34,
            jitter: 0.5,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(G)
                    .speed(1.5)
                    .bonusHp(2)
                    .worth(6)
                    .build()
            ),
            cap: 32
        },
        {
            every: 50,
            jitter: 0.35,
            factory: spawnAtTopLine(
                MobBlueprintBuilder.of(B)
                    .speed(1.4)
                    .bonusHp(1)
                    .worth(4)
                    .build(),
                6, 72
            ),
            cap: 64
        },
    ],
});

const p5 = createPhase({
    name: "P5",
    until: ({score}) => score >= 2048,
    rules: [
        {
            every: 20,
            jitter: 0.4,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(B)
                    .speed(1)
                    .bonusHp(6)
                    .worth(10)
                    .color('#910000')
                    .build()
            ),
            cap: 90
        },
        {
            every: 25,
            jitter: 0.8,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(B)
                    .speed(1.4)
                    .bonusHp(4)
                    .worth(7)
                    .color('#ff2121')
                    .build()
            ),
            cap: 96,
        },
        {
            every: 45,
            jitter: 0.5,
            factory: spawnAtTopLine(
                MobBlueprintBuilder.of(G)
                    .speed(0.82)
                    .bonusHp(2)
                    .worth(6)
                    .build(),
                3, 72
            ),
            cap: 64
        },
        {
            every: 80,
            jitter: 0.35,
            factory: spawnAtTopLine(
                MobBlueprintBuilder.of(B)
                    .speed(1)
                    .bonusHp(1)
                    .worth(4)
                    .build(),
                6, 64
            ),
            cap: 72
        },
    ],
});

const p6 = createPhase({
    name: "P6",
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnAtTop(
                MobBlueprintBuilder.of(B)
                    .speed(0.98)
                    .bonusHp(14)
                    .worth(8)
                    .color('#910000')
                    .build()
            ),
            cap: 32
        },
        {
            every: 80,
            jitter: 0.5,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(G)
                    .speed(0.83)
                    .bonusHp(6)
                    .build()
            ),
            cap: 32
        },
    ],
});

const p7 = createPhase({
    name: "P7",
    until: ({score}) => score >= 7168,
    rules: [
        {
            every: 40,
            jitter: 0.4,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(B)
                    .speed(1)
                    .bonusHp(8)
                    .worth(10)
                    .color('#910000')
                    .scale((ctx) => 1 + (ctx.score / 600) | 0)
                    .build()
            ),
            cap: 94
        },
        {
            every: 20,
            jitter: 0.6,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(T)
                    .speed(0.9)
                    .worth(16)
                    .color('#9f3b00')
                    .scale((ctx) => 1 + (ctx.score / 800) | 0)
                    .build()
            ),
            cap: 72,
        },
        {
            every: 80,
            jitter: 0.5,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(M)
                    .speed(0.8)
                    .bonusHp(4)
                    .worth(4)
                    .color('#ac0000')
                    .build()
            ),
            cap: 70
        },
        {
            every: 120,
            jitter: 0.4,
            factory: spawnFormation([
                MobBlueprintBuilder.of(T)
                    .speed(0.5)
                    .worth(12)
                    .color('#ac0000')
                    .build(),
                MobBlueprintBuilder.of(MG)
                    .speed(0.5)
                    .worth(12)
                    .color('#ac0000')
                    .build()
            ]),
            cap: 96
        },
        {
            every: 320,
            jitter: 0.6,
            factory: spawnExplosion(),
            cap: 68
        }
    ],
});

const p8 = createPhase({
    name: "P8",
    until: ({score}) => score >= 9216,
    rules: [
        {
            every: 80,
            jitter: 0.4,
            factory: spawnInMap(
                MobBlueprintBuilder.of(B)
                    .speed(1.2)
                    .bonusHp(8)
                    .worth(8)
                    .color('#910000')
                    .scale((ctx) => 1 + (ctx.score / 500) | 0)
                    .setWander()
                    .build()
            ),
            cap: 64
        },
        {
            every: 50,
            jitter: 0.6,
            factory: spawnInMap(
                MobBlueprintBuilder.of(T)
                    .speed(1)
                    .bonusHp(1)
                    .worth(8)
                    .color('#9f3b00')
                    .scale((ctx) => 1 + (ctx.score / 800) | 0)
                    .build(),
                undefined, 248
            ),
            cap: 64
        },
        {
            every: 200,
            jitter: 0.5,
            factory: spawnInMap(
                MobBlueprintBuilder.of(M)
                    .speed(0.8)
                    .bonusHp(4)
                    .worth(4)
                    .color('#ac0000')
                    .setWander()
                    .build(),
                undefined, 480
            ),
            cap: (ctx) => ctx.difficulty + 48
        },
        {
            every: 250,
            jitter: 0.4,
            factory: spawnInMap(
                MobBlueprintBuilder.of(G)
                    .speed(0.72)
                    .bonusHp(4)
                    .worth(3)
                    .setWander()
                    .build()
            ),
            cap: (ctx) => ctx.difficulty + 48
        },
        {
            every: 320,
            jitter: 0.8,
            factory: spawnExplosion(),
            cap: 64
        }
    ],
});

const p9 = createPhase({
    name: "P9",
    rules: [
        {
            every: 80,
            jitter: 0.4,
            factory: spawnInMap(
                MobBlueprintBuilder.of(B)
                    .speed(1.2)
                    .bonusHp(8)
                    .worth(8)
                    .color('#910000')
                    .scale((ctx) => 1 + (ctx.score / 400) | 0)
                    .setWander()
                    .build()
            ),
            cap: 81
        },
        {
            every: 50,
            jitter: 0.6,
            factory: spawnInMap(
                MobBlueprintBuilder.of(T)
                    .speed(1.1)
                    .bonusHp(1)
                    .worth(8)
                    .color('#9f3b00')
                    .scale((ctx) => 1 + (ctx.score / 600) | 0)
                    .setWander()
                    .build(),
                undefined, 248
            ),
            cap: (ctx) => ctx.difficulty + 64,
        },
        {
            every: 200,
            jitter: 0.5,
            factory: spawnInMap(
                MobBlueprintBuilder.of(M)
                    .speed(0.8)
                    .bonusHp(4)
                    .worth(4)
                    .color('#ac0000')
                    .setWander()
                    .build(),
                undefined, 480
            ),
            cap: (ctx) => ctx.difficulty * 2 + 48
        },
        {
            every: 250,
            jitter: 0.4,
            factory: spawnInMap(
                MobBlueprintBuilder.of(MG)
                    .speed(0.72)
                    .bonusHp(8)
                    .worth(12)
                    .color('#ff4444')
                    .setWander()
                    .build(),
                undefined, 640
            ),
            cap: (ctx) => ctx.difficulty * 2 + 48
        },
        {
            every: 250,
            jitter: 0.8,
            factory: spawnExplosion(),
            cap: 64
        }
    ],
});

export const STAGE = new Stage([p0, p1, p2, p3, p4, p5, p6, p7, p8, p9]);