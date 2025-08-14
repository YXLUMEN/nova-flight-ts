import type {PhaseConfig} from "../apis/IStage.ts";
import {spawnLine, spawnTopRandom} from "../utils/factories.ts";
import {Stage} from "../stage/Stage.ts";
import {createCleanObj, deepFreeze} from "../utils/uit.ts";
import {randInt} from "../math/math.ts";

const intro: PhaseConfig = deepFreeze(createCleanObj({
    name: "Intro",
    until: ({score}) => score >= 30,
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'Intro'}),
    rules: [
        {every: 1.2, jitter: 0.3, factory: spawnTopRandom(110), cap: 30},
        {every: 5.0, jitter: 0.2, factory: spawnLine(4, 56, 120)},
    ],
}));

const mid: PhaseConfig = deepFreeze(createCleanObj({
    name: "Mid",
    until: ({score}) => score >= 200,
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'Mid'}),
    rules: [
        {
            rate: ({score}) => 1.0 + 0.3 * Math.floor(score / 40),
            jitter: 0.4,
            factory: spawnTopRandom(110, randInt(2, 5), 4),
            cap: 24,
        },
        {every: 4.0, jitter: 0.35, factory: spawnLine(6, 64, 150)},
    ],
}));

const end: PhaseConfig = deepFreeze(createCleanObj({
    name: "End",
    onEnter: ({world}) => world.events.emit('stage-enter', {name: 'End'}),
    rules: [
        {
            rate: ({score}) => 1.0 + 0.5 * Math.floor(score / 40),
            jitter: 0.5,
            factory: spawnTopRandom(120, randInt(4, 10), 8),
            cap: 28,
        },
        {every: 4.0, jitter: 0.35, factory: spawnLine(8, 72, 160, 3, 2)},
    ],
}));

export const STAGE = new Stage([intro, mid, end]);