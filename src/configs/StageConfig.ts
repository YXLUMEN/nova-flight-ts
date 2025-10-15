import type {PhaseConfig} from "../apis/IStage.ts";
import {Stage} from "../stage/Stage.ts";
import {createCleanObj, deepFreeze} from "../utils/uit.ts";
import {spawnAtTop, spawnAtTopInLine, spawnAtTopS, spawnInMap, spawnMiniGun,} from "../utils/PresetsSpawn.ts";
import {EVENTS} from "../apis/IEvents.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

const p0: PhaseConfig = deepFreeze(createCleanObj({
    name: "P0",
    duration: 60,
    rules: []
}));

const p1: PhaseConfig = deepFreeze(createCleanObj({
    name: "P1",
    duration: 2400,
    until: ({score}) => score >= 64,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P1'}),
    rules: [
        {every: 30, jitter: 0.3, factory: spawnAtTop(EntityTypes.BASE_ENEMY, 0.9, 0), cap: 32},
    ],
}));

const p2: PhaseConfig = deepFreeze(createCleanObj({
    name: "P2",
    until: ({score}) => score >= 200,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P2'}),
    rules: [
        {every: 30, jitter: 0.3, factory: spawnAtTop(EntityTypes.BASE_ENEMY, 0.9, 2, 4), cap: 16},
        {
            every: 150, jitter: 0.2, factory: spawnAtTopInLine(EntityTypes.BASE_ENEMY,
                4, 56, 0.9, 0, 2),
            cap: 48
        },
    ],
}));

const p3: PhaseConfig = deepFreeze(createCleanObj({
    name: "P3",
    until: ({score}) => score >= 512,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P3'}),
    rules: [
        {
            every: 35,
            jitter: 0.4,
            factory: spawnAtTop(EntityTypes.BASE_ENEMY, 1.1, 2, 6, '#ff2121'),
            cap: 64,
        },
        {
            every: 60, jitter: 0.5, factory: spawnAtTopS(EntityTypes.GUN_ENEMY_ENTITY,
                0.9, 1, 4),
            cap: 24
        },
        {
            every: 100, jitter: 0.35, factory: spawnAtTopInLine(EntityTypes.BASE_ENEMY,
                4, 64, 1.4, 0, 2),
            cap: 48
        },
    ],
}));

const p4: PhaseConfig = deepFreeze(createCleanObj({
    name: "P4",
    until: ({score}) => score >= 1024,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P4'}),
    rules: [
        {
            every: 40,
            jitter: 0.4,
            factory: spawnAtTopS(EntityTypes.BASE_ENEMY, 0.92, 4, 8, '#c10000'),
            cap: 64,
        },
        {
            every: 60, jitter: 0.5, factory: spawnAtTopS(EntityTypes.GUN_ENEMY_ENTITY,
                0.9, 2, 6),
            cap: 32
        },
        {
            every: 100, jitter: 0.35, factory: spawnAtTopInLine(EntityTypes.BASE_ENEMY,
                6, 72, 1.4, 1, 4),
            cap: 64
        },
    ],
}));

const p5: PhaseConfig = deepFreeze(createCleanObj({
    name: "P5",
    until: ({score}) => score >= 2048,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P5'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnAtTopS(EntityTypes.BASE_ENEMY,
                0.9, 6, 10,
                '#910000'
            ),
            cap: 90
        },
        {
            every: 25,
            jitter: 0.8,
            factory: spawnAtTopS(EntityTypes.BASE_ENEMY,
                0.98, 4, 7,
                '#ff2121',
            ),
            cap: 96,
        },
        {
            every: 45, jitter: 0.5, factory: spawnAtTopInLine(EntityTypes.GUN_ENEMY_ENTITY,
                3, 72, 0.82, 2, 6),
            cap: 64
        },
        {
            every: 200, jitter: 0.35, factory: spawnAtTopInLine(EntityTypes.BASE_ENEMY,
                6, 64, 1, 1, 4),
            cap: 72
        },
    ],
}));

const p6: PhaseConfig = deepFreeze(createCleanObj({
    name: "P6",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P6'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnAtTop(EntityTypes.BASE_ENEMY,
                0.98, 14, 8,
                '#910000'
            ),
            cap: 32
        },
        {every: 80, jitter: 0.5, factory: spawnAtTopS(EntityTypes.GUN_ENEMY_ENTITY, 0.83, 6), cap: 32},
    ],
}));

const p7: PhaseConfig = deepFreeze(createCleanObj({
    name: "P7",
    until: ({score}) => score >= 7168,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P7'}),
    onExit: ({world}) => world.events.emit(EVENTS.STAGE_EXIT, {name: 'P7'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnAtTopS(EntityTypes.BASE_ENEMY,
                0.98, 8, 10,
                '#910000',
                (ctx) => 1 + (ctx.score / 600) | 0
            ),
            cap: 94
        },
        {
            every: 18,
            jitter: 0.6,
            factory: spawnAtTopS(EntityTypes.TANK_ENEMY_ENTITY,
                0.84, 0, 16,
                '#9f3b00',
                (ctx) => 1 + (ctx.score / 800) | 0
            ),
            cap: 72,
        },
        {
            every: 100, jitter: 0.5, factory: spawnAtTopS(EntityTypes.MISSILE_ENEMY_ENTITY,
                0.8, 4, 4, '#ac0000'),
            cap: 70
        },
        {every: 150, jitter: 0.4, factory: spawnMiniGun(0.5, 0, 12), cap: 96},
    ],
}));

const p8: PhaseConfig = deepFreeze(createCleanObj({
    name: "P8",
    until: ({score}) => score >= 8192,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P8'}),
    rules: [
        {
            every: 80,
            jitter: 0.4,
            factory: spawnInMap(EntityTypes.BASE_ENEMY,
                0.9, 6, 8,
                '#910000'
            ),
            cap: 64
        },
        {
            every: 60,
            jitter: 0.8,
            factory: spawnInMap(EntityTypes.BASE_ENEMY,
                0.96, 2, 4,
                '#ff2121',
            ),
            cap: 66,
        },
        {every: 150, jitter: 0.5, factory: spawnInMap(EntityTypes.GUN_ENEMY_ENTITY, 0.84, 2), cap: 48},
    ],
}));

const p9: PhaseConfig = deepFreeze(createCleanObj({
    name: "P9",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P9'}),
    rules: [
        {
            every: 80,
            jitter: 0.4,
            factory: spawnInMap(EntityTypes.BASE_ENEMY,
                0.96, 6, 8,
                '#910000',
                {},
                (ctx) => 1 + (ctx.score / 500) | 0
            ),
            cap: 72
        },
        {
            every: 50,
            jitter: 0.6,
            factory: spawnInMap(EntityTypes.TANK_ENEMY_ENTITY,
                0.82, 0, 8,
                '#9f3b00',
                {safeRadius: 248},
                (ctx) => 1 + (ctx.score / 700) | 0
            ),
            cap: 64,
        },
        {
            every: 200, jitter: 0.5, factory: spawnInMap(EntityTypes.MISSILE_ENEMY_ENTITY,
                0.8, 4, 4,
                '#ac0000',
                {safeRadius: 480}
            ),
            cap: 48
        },
        {
            every: 250, jitter: 0.4, factory: spawnInMap(EntityTypes.MINIGUN_ENEMY_ENTITY, 0.72, 0, 12),
            cap: 46
        },
    ],
}));

export const STAGE = new Stage([p0, p1, p2, p3, p4, p5, p6, p7, p8, p9]);