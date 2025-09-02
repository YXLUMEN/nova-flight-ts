import type {PhaseConfig} from "../apis/IStage.ts";
import {Stage} from "../stage/Stage.ts";
import {createCleanObj, deepFreeze} from "../utils/uit.ts";
import {spawnBase, spawnBaseS, spawnGun, spawnLineBase, spawnMiniGun, spawnTank} from "../utils/PresetsSpawn.ts";
import {EVENTS} from "../apis/IEvents.ts";

const p0: PhaseConfig = deepFreeze(createCleanObj({
    name: "P0",
    duration: 3,
    rules: []
}));

const p1: PhaseConfig = deepFreeze(createCleanObj({
    name: "P1",
    duration: 120,
    until: ({score}) => score >= 64,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P1'}),
    rules: [
        {every: 0.6, jitter: 0.3, factory: spawnBase(2, 0), cap: 30},
    ],
}));

const p2: PhaseConfig = deepFreeze(createCleanObj({
    name: "P2",
    until: ({score}) => score >= 320,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P2'}),
    rules: [
        {every: 1.2, jitter: 0.3, factory: spawnBase(2, 2), cap: 48},
        {every: 5.0, jitter: 0.2, factory: spawnLineBase(4, 56, 2.4)},
    ],
}));

const p3: PhaseConfig = deepFreeze(createCleanObj({
    name: "P3",
    until: ({score}) => score >= 720,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P3'}),
    rules: [
        {
            rate: ({score}) => 1.0 + 0.3 * (score / 40) | 0,
            jitter: 0.4,
            factory: spawnBase(2.2, 1, 2, '#ff2121'),
            cap: 64,
        },
        {every: 1.2, jitter: 0.5, factory: spawnGun(2, 2)},
        {every: 2.0, jitter: 0.35, factory: spawnLineBase(4, 64, 2.4)},
    ],
}));

const p4: PhaseConfig = deepFreeze(createCleanObj({
    name: "P4",
    until: ({score}) => score >= 2048,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P4'}),
    rules: [
        {
            rate: ({score}) => 1.0 + 0.3 * (score / 60) | 0,
            jitter: 0.4,
            factory: spawnBaseS(2.2, 4, 3, '#ff2121'),
            cap: 32,
        },
        {every: 1.2, jitter: 0.5, factory: spawnGun(2, 2, 2)},
        {every: 2.0, jitter: 0.35, factory: spawnLineBase(6, 72, 2.8)},
    ],
}));

const p5: PhaseConfig = deepFreeze(createCleanObj({
    name: "P5",
    until: ({score}) => score >= 4096,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P5'}),
    rules: [
        {
            rate: 1,
            jitter: 0.4,
            factory: spawnBaseS(
                2.2, 6, 8,
                '#910000'
            ),
            cap: 90
        },
        {
            rate: 2,
            jitter: 0.8,
            factory: spawnBaseS(
                2.4, 2, 4,
                '#ff2121',
            ),
            cap: 96,
        },
        {every: 0.9, jitter: 0.5, factory: spawnGun(1.6, 2), cap: 96},
        {every: 4.0, jitter: 0.35, factory: spawnLineBase(6, 64, 2.6, 1)},
    ],
}));

const p6: PhaseConfig = deepFreeze(createCleanObj({
    name: "P6",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P6'}),
    rules: [
        {
            every: 0.4,
            jitter: 0.4,
            factory: spawnBase(
                2.2, 14, 8,
                '#910000'
            ),
            cap: 94
        },
        {rate: 3, jitter: 0.5, factory: spawnGun(1.6, 6), cap: 96},
    ],
}));

const p7: PhaseConfig = deepFreeze(createCleanObj({
    name: "P7",
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'P7'}),
    rules: [
        {
            rate: 1,
            jitter: 0.4,
            factory: spawnBaseS(
                2.2, 6, 8,
                '#910000',
                (ctx) => 1 + (ctx.score / 1000) | 0
            ),
            cap: 94
        },
        {
            rate: 3,
            jitter: 0.6,
            factory: spawnTank(
                1.2, 0, 8,
                '#9f3b00',
            ),
            cap: 72,
        },
        {every: 0.9, jitter: 0.5, factory: spawnGun(1.6, 4, 4), cap: 96},
        {every: 2.0, jitter: 0.4, factory: spawnMiniGun(0.8, 0, 12), cap: 96},
    ],
}));

export const STAGE = new Stage([p0, p1, p2, p3, p4, p5, p6, p7]);