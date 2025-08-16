import type {PhaseConfig} from "../apis/IStage.ts";
import {Stage} from "../stage/Stage.ts";
import {createCleanObj, deepFreeze} from "../utils/uit.ts";
import {randInt} from "../math/math.ts";
import {spawnBase, spawnBaseS, spawnGun, spawnLineBase} from "../utils/PresetsSpawn.ts";

const p1: PhaseConfig = deepFreeze(createCleanObj({
    name: "P1",
    duration: 120,
    until: ({score}) => score >= 64,
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'P1'}),
    rules: [
        {every: 0.6, jitter: 0.3, factory: spawnBase(100, 2), cap: 30},
    ],
}));

const p2: PhaseConfig = deepFreeze(createCleanObj({
    name: "P2",
    until: ({score}) => score >= 128,
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'P2'}),
    rules: [
        {every: 1.2, jitter: 0.3, factory: spawnBase(100, 2), cap: 48},
        {every: 4.0, jitter: 0.2, factory: spawnLineBase(4, 56, 120)},
    ],
}));

const p3: PhaseConfig = deepFreeze(createCleanObj({
    name: "P3",
    until: ({score}) => score >= 320,
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'P3'}),
    rules: [
        {
            every: 1,
            jitter: 0.4,
            factory: spawnBase(110, 3, 2, '#ff2121'),
            cap: 64,
        },
        {every: 1.2, jitter: 0.5, factory: spawnGun(100, 2, 2)},
        {every: 2.0, jitter: 0.35, factory: spawnLineBase(4, 64, 120)},
    ],
}));

const p4: PhaseConfig = deepFreeze(createCleanObj({
    name: "P4",
    until: ({score}) => score >= 640,
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'P4'}),
    rules: [
        {
            every: 0.6,
            jitter: 0.4,
            factory: spawnBaseS(110, randInt(3, 6), 3, '#ff2121'),
            cap: 32,
        },
        {every: 1.2, jitter: 0.5, factory: spawnGun(100, 2, 2), cap: 48},
        {every: 2.0, jitter: 0.35, factory: spawnLineBase(6, 72, 140)},
    ],
}));

const p5: PhaseConfig = deepFreeze(createCleanObj({
    name: "P5",
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'P5'}),
    rules: [
        {
            every: 0.4,
            jitter: 0.4,
            factory: spawnBaseS(randInt(90, 160), randInt(8, 16), 10, '#910000'),
        },
        {every: 0.9, jitter: 0.5, factory: spawnGun(80, 6), cap: 64},
        {every: 4.0, jitter: 0.35, factory: spawnLineBase(6, 64, 140, 4, 2)},
    ],
}));

export const M_STAGE = new Stage([p1, p2, p3, p4, p5]);