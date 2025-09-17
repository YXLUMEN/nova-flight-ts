import type {PhaseConfig} from "../apis/IStage.ts";
import {Stage} from "../stage/Stage.ts";
import {createCleanObj, deepFreeze} from "../utils/uit.ts";
import {spawnInMap} from "../utils/PresetsSpawn.ts";
import {EVENTS} from "../apis/IEvents.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

const p1: PhaseConfig = deepFreeze(createCleanObj({
    name: "mP1",
    until: ({score}) => score >= 1024,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'mP1'}),
    rules: [
        {
            every: 60,
            jitter: 0.4,
            factory: spawnInMap(EntityTypes.BASE_ENEMY, 0.2, 4, 3, '#ff2121'),
            cap: 32,
        },
        {every: 80, jitter: 0.5, factory: spawnInMap(EntityTypes.GUN_ENEMY_ENTITY, 0.1, 2, 2), cap: 16},
    ],
}));

const p2: PhaseConfig = deepFreeze(createCleanObj({
    name: "mP2",
    until: ({score}) => score >= 2048,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'mP2'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnInMap(EntityTypes.BASE_ENEMY,
                0.2, 6, 8,
                '#910000'
            ),
            cap: 64
        },
        {
            every: 30,
            jitter: 0.8,
            factory: spawnInMap(EntityTypes.BASE_ENEMY,
                0.22, 2, 4,
                '#ff2121',
            ),
            cap: 66,
        },
        {every: 60, jitter: 0.5, factory: spawnInMap(EntityTypes.GUN_ENEMY_ENTITY, 0.16, 2), cap: 32},
    ],
}));

const p3: PhaseConfig = deepFreeze(createCleanObj({
    name: "mP3",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'mP3'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnInMap(EntityTypes.BASE_ENEMY,
                0.2, 6, 8,
                '#910000'
            ),
            cap: 8
        }
    ],
}));

const p4: PhaseConfig = deepFreeze(createCleanObj({
    name: "mP4",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'mP4'}),
    rules: [
        {
            every: 80,
            jitter: 0.4,
            factory: spawnInMap(EntityTypes.BASE_ENEMY,
                0.22, 6, 8,
                '#910000',
                {},
                (ctx) => 1 + (ctx.score / 1000) | 0
            ),
            cap: 72
        },
        {
            every: 50,
            jitter: 0.6,
            factory: spawnInMap(EntityTypes.TANK_ENEMY_ENTITY,
                0.12, 0, 8,
                '#9f3b00',
                {safeRadius: 248},
                (ctx) => 1 + Math.log2(ctx.score) | 0
            ),
            cap: 64,
        },
        {
            every: 150, jitter: 0.5, factory: spawnInMap(EntityTypes.GUN_ENEMY_ENTITY,
                0.16, 4, 4,
                '#ac0000',
                {safeRadius: 480}
            ),
            cap: 64
        },
        {every: 200, jitter: 0.4, factory: spawnInMap(EntityTypes.MINIGUN_ENEMY_ENTITY, 0.08, 0, 12), cap: 32},
    ],
}));

export const STAGE2 = new Stage([p1, p2, p3, p4]);