import {Stage} from "../world/stage/Stage.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {createPhase} from "../world/stage/PhaseConfig.ts";
import {spawnAtTop, spawnAtTopBest} from "../world/stage/SpawnStrategy.ts";
import {MobBlueprintBuilder} from "../world/stage/MobBlueprint.ts";

const intro = createPhase('tutorial_intro').build();

const move = createPhase('tutorial_move').build();

const fire = createPhase('tutorial_fire').build();

const enemy = createPhase('tutorial_enemy')
    .rules({
        every: 30,
        jitter: 0.3,
        factory: spawnAtTop(MobBlueprintBuilder.of(EntityTypes.BASE_ENEMY)
            .speed(1)
            .bonusHp(0)
            .worth(100)
            .build()
        ),
        cap: 24
    })
    .build();

const inventory = createPhase('tutorial_inventory').build();

const tech = createPhase('tutorial_tech')
    .rules({
        every: 20,
        jitter: 0.3,
        factory: spawnAtTop(MobBlueprintBuilder.of(EntityTypes.BASE_ENEMY)
            .speed(1)
            .bonusHp(512)
            .worth(200)
            .build()
        ),
        cap: 32
    }, {
        every: 30,
        jitter: 0.3,
        factory: spawnAtTop(MobBlueprintBuilder.of(EntityTypes.TANK_ENEMY_ENTITY)
            .speed(1)
            .bonusHp(0)
            .worth(8)
            .color('#6e3400')
            .build()
        ),
        cap: 24
    })
    .build();

const boss = createPhase('tutorial_boss')
    .rules({
        every: 30,
        jitter: 0.3,
        factory: spawnAtTop(MobBlueprintBuilder.of(EntityTypes.TANK_ENEMY_ENTITY)
            .speed(1)
            .bonusHp(0)
            .worth(8)
            .color('#6e3400')
            .build()
        ),
        cap: 16
    }, {
        every: 30,
        jitter: 0.5,
        factory: spawnAtTopBest(MobBlueprintBuilder.of(EntityTypes.GUN_ENEMY_ENTITY)
            .speed(1)
            .bonusHp(1)
            .worth(4)
            .build(),
        ),
        cap: 16
    },)
    .build();

const end = createPhase('tutorial_end').build();

export const TutorialStage = new Stage([intro, move, fire, enemy, inventory, tech, boss, end]);