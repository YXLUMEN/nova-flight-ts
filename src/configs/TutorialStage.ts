import {Stage} from "../world/stage/Stage.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {createPhase} from "../world/stage/PhaseConfig.ts";
import {spawnAtTop, spawnAtTopBest} from "../world/stage/SpawnStrategy.ts";
import {MobBlueprintBuilder} from "../world/stage/MobBlueprint.ts";

const intro = createPhase({
    name: 'tutorial_intro',
    rules: [],
});

const move = createPhase({
    name: 'tutorial_move',
    rules: [],
});

const fire = createPhase({
    name: 'tutorial_fire',
    rules: [],
});

const enemy = createPhase({
    name: 'tutorial_enemy',
    rules: [{
        every: 30,
        jitter: 0.3,
        factory: spawnAtTop(
            MobBlueprintBuilder.of(EntityTypes.BASE_ENEMY)
                .speed(1)
                .bonusHp(0)
                .worth(100)
                .build()
        ),
        cap: 24
    }],
});

const tech = createPhase({
    name: 'tutorial_tech',
    rules: [
        {
            every: 20,
            jitter: 0.3,
            factory: spawnAtTop(
                MobBlueprintBuilder.of(EntityTypes.BASE_ENEMY)
                    .speed(1)
                    .bonusHp(512)
                    .worth(200)
                    .build()
            ),
            cap: 32
        },
        {
            every: 30,
            jitter: 0.3,
            factory: spawnAtTop(
                MobBlueprintBuilder.of(EntityTypes.TANK_ENEMY_ENTITY)
                    .speed(1)
                    .bonusHp(0)
                    .worth(8)
                    .color('#6e3400')
                    .build()
            ),
            cap: 24
        },],
});

const boss = createPhase({
    name: 'tutorial_boss',
    rules: [
        {
            every: 30,
            jitter: 0.3,
            factory: spawnAtTop(
                MobBlueprintBuilder.of(EntityTypes.TANK_ENEMY_ENTITY)
                    .speed(1)
                    .bonusHp(0)
                    .worth(8)
                    .color('#6e3400')
                    .build()
            ),
            cap: 16
        },
        {
            every: 30,
            jitter: 0.5,
            factory: spawnAtTopBest(
                MobBlueprintBuilder.of(EntityTypes.GUN_ENEMY_ENTITY)
                    .speed(1)
                    .bonusHp(1)
                    .worth(4)
                    .build(),
            ),
            cap: 16
        },
    ],
});

const end = createPhase({
    name: 'tutorial_end',
    rules: [],
});

export const TutorialStage = new Stage([intro, move, fire, enemy, tech, boss, end]);