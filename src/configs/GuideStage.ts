import {createCleanObj, deepFreeze} from "../utils/uit.ts";
import {Stage} from "../stage/Stage.ts";
import type {PhaseConfig} from "../apis/IStage.ts";
import {spawnAtTop} from "../utils/PresetsSpawn.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {EVENTS} from "../apis/IEvents.ts";

const intro: PhaseConfig = deepFreeze(createCleanObj({
    name: 'in',
    duration: 50,
    rules: [],
}));

const move: PhaseConfig = deepFreeze(createCleanObj({
    name: 'move',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'g_move'}),
    rules: [],
}));

const fire: PhaseConfig = deepFreeze(createCleanObj({
    name: 'fire',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'g_fire'}),
    rules: [],
}));

const enemy: PhaseConfig = deepFreeze(createCleanObj({
    name: 'enemy',
    until: ({score}) => score > 900,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'g_enemy'}),
    rules: [{
        every: 30,
        jitter: 0.3,
        factory: spawnAtTop(EntityTypes.BASE_ENEMY, 0.1, 0, 100),
        cap: 6
    }],
}));

const tech: PhaseConfig = deepFreeze(createCleanObj({
    name: 'tech',
    until: ({score}) => score > 2000,
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'g_tech'}),
    rules: [{
        every: 30,
        jitter: 0.3,
        factory: spawnAtTop(EntityTypes.TANK_ENEMY_ENTITY, 0.1, 64, 200, '#6e3400'),
        cap: 3
    }],
}));

const boss: PhaseConfig = deepFreeze(createCleanObj({
    name: 'boss',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'g_boss'}),
    rules: [],
}));

const end: PhaseConfig = deepFreeze(createCleanObj({
    name: 'end',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'g_end'}),
    rules: [],
}));

export const GuideStage = new Stage([intro, move, fire, enemy, tech, boss, end]);