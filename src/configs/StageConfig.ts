import type {PhaseConfig} from "../apis/IStage.ts";
import {Stage} from "../stage/Stage.ts";
import {createCleanObj, deepFreeze} from "../utils/uit.ts";
import {spawnBase, spawnBaseS, spawnGun, spawnLineBase, spawnMiniGun, spawnTank} from "../utils/PresetsSpawn.ts";
import {EVENTS} from "../apis/IEvents.ts";

const p0: PhaseConfig = deepFreeze(createCleanObj({
    name: "P0",
    duration: 150,
    rules: []
}));

const p1: PhaseConfig = deepFreeze(createCleanObj({
    name: "P1",
    duration: 6000,
    until: ({score}) => score >= 64,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P1'}),
    rules: [
        {every: 30, jitter: 0.3, factory: spawnBase(0.2, 0), cap: 30},
    ],
}));

const p2: PhaseConfig = deepFreeze(createCleanObj({
    name: "P2",
    until: ({score}) => score >= 320,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P2'}),
    rules: [
        {every: 60, jitter: 0.3, factory: spawnBase(0.2, 2), cap: 48},
        {every: 250, jitter: 0.2, factory: spawnLineBase(4, 56, 0.24)},
    ],
}));

const p3: PhaseConfig = deepFreeze(createCleanObj({
    name: "P3",
    until: ({score}) => score >= 720,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P3'}),
    rules: [
        {
            every: 35,
            jitter: 0.4,
            factory: spawnBase(0.22, 1, 2, '#ff2121'),
            cap: 64,
        },
        {every: 60, jitter: 0.5, factory: spawnGun(0.2, 2)},
        {every: 100, jitter: 0.35, factory: spawnLineBase(4, 64, 0.24)},
    ],
}));

const p4: PhaseConfig = deepFreeze(createCleanObj({
    name: "P4",
    until: ({score}) => score >= 2048,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P4'}),
    rules: [
        {
            every: 40,
            jitter: 0.4,
            factory: spawnBaseS(0.22, 4, 3, '#ff2121'),
            cap: 32,
        },
        {every: 60, jitter: 0.5, factory: spawnGun(0.2, 2, 2)},
        {every: 100, jitter: 0.35, factory: spawnLineBase(6, 72, 0.28)},
    ],
}));

const p5: PhaseConfig = deepFreeze(createCleanObj({
    name: "P5",
    until: ({score}) => score >= 4096,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P5'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnBaseS(
                0.22, 6, 8,
                '#910000'
            ),
            cap: 90
        },
        {
            every: 25,
            jitter: 0.8,
            factory: spawnBaseS(
                0.24, 2, 4,
                '#ff2121',
            ),
            cap: 96,
        },
        {every: 45, jitter: 0.5, factory: spawnGun(0.16, 2), cap: 96},
        {every: 200, jitter: 0.35, factory: spawnLineBase(6, 64, 0.26, 1)},
    ],
}));

const p6: PhaseConfig = deepFreeze(createCleanObj({
    name: "P6",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P6'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnBase(
                0.22, 14, 8,
                '#910000'
            ),
            cap: 32
        },
        {every: 80, jitter: 0.5, factory: spawnGun(0.16, 6), cap: 32},
    ],
}));

const p7: PhaseConfig = deepFreeze(createCleanObj({
    name: "P7",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P7'}),
    rules: [
        {
            every: 50,
            jitter: 0.4,
            factory: spawnBaseS(
                0.22, 6, 8,
                '#910000',
                (ctx) => 1 + (ctx.score / 1000) | 0
            ),
            cap: 94
        },
        {
            every: 18,
            jitter: 0.6,
            factory: spawnTank(
                0.12, 0, 8,
                '#9f3b00',
                (ctx) => 1 + Math.log2(ctx.score) | 0
            ),
            cap: 72,
        },
        {every: 100, jitter: 0.5, factory: spawnGun(0.16, 4, 4), cap: 96},
        {every: 150, jitter: 0.4, factory: spawnMiniGun(0.08, 0, 12), cap: 96},
    ],
}));

export const STAGE = new Stage([p0, p1, p2, p3, p4, p5, p6, p7]);