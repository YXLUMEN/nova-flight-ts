import {Stage} from "../stage/Stage.ts";
import {spawnAtTop, spawnAtTopS} from "../utils/PresetsSpawn.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {EVENTS} from "../apis/IEvents.ts";
import {PhaseConfigBuilder} from "../stage/PhaseConfig.ts";

const intro = PhaseConfigBuilder.create({
    name: 'intro',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'tutorial_intro'}),
    rules: [],
});

const move = PhaseConfigBuilder.create({
    name: 'move',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'tutorial_move'}),
    rules: [],
});

const fire = PhaseConfigBuilder.create({
    name: 'fire',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'tutorial_fire'}),
    rules: [],
});

const enemy = PhaseConfigBuilder.create({
    name: 'enemy',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'tutorial_enemy'}),
    rules: [{
        every: 30,
        jitter: 0.3,
        factory: spawnAtTop(EntityTypes.BASE_ENEMY, 1, 0, 100),
        cap: 24
    }],
});

const tech = PhaseConfigBuilder.create({
    name: 'tech',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'tutorial_tech'}),
    rules: [
        {
            every: 20,
            jitter: 0.3,
            factory: spawnAtTop(EntityTypes.BASE_ENEMY, 1, 512, 200),
            cap: 32
        },
        {
            every: 30,
            jitter: 0.3,
            factory: spawnAtTop(EntityTypes.TANK_ENEMY_ENTITY, 1, 0, 8, '#6e3400'),
            cap: 24
        },],
});

const boss = PhaseConfigBuilder.create({
    name: 'boss',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'tutorial_boss'}),
    rules: [
        {
            every: 30,
            jitter: 0.3,
            factory: spawnAtTop(EntityTypes.TANK_ENEMY_ENTITY, 1, 0, 8, '#6e3400'),
            cap: 16
        },
        {
            every: 30,
            jitter: 0.5,
            factory: spawnAtTopS(EntityTypes.GUN_ENEMY_ENTITY, 1, 1, 4),
            cap: 16
        },
    ],
});

const end = PhaseConfigBuilder.create({
    name: 'end',
    onEnter: ({world}) => world.events.emit(EVENTS.STAGE_ENTER, {name: 'tutorial_end'}),
    rules: [],
});

export const TutorialStage = new Stage([intro, move, fire, enemy, tech, boss, end]);