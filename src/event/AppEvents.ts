import type {GameStart} from "./events/GameStart.ts";
import type {GameEnd} from "./events/GameEnd.ts";
import type {GameOver} from "./events/GameOver.ts";
import type {EntityRemoved} from "./events/EntityRemoved.ts";
import type {BossKilled} from "./events/BossKilled.ts";
import type {BossSpawn} from "./events/BossSpawn.ts";
import type {MobKilled} from "./events/MobKilled.ts";
import type {MobDamage} from "./events/MobDamage.ts";
import type {PlayerDead} from "./events/PlayerDead.ts";
import type {UnlockTech} from "./events/UnlockTech.ts";
import type {UnlockTechEntry} from "./events/UnlockTechEntry.ts";
import type {ExplosionEvent} from "./events/ExplosionEvent.ts";
import type {EmpBurstEvent} from "./events/EmpBurstEvent.ts";
import type {StageEnter} from "./events/StageEnter.ts";
import type {StageExit} from "./events/StageExit.ts";
import type {MissileLockEntity} from "./events/MissileLockEntity.ts";
import type {DifficultChange} from "./events/DifficultChange.ts";

export interface AppEvents {
    'game:start': GameStart;
    'game:end': GameEnd;
    'game:over': GameOver;
    'world:explosion': ExplosionEvent;
    'world:emp_burst': EmpBurstEvent;
    'world:stage:enter': StageEnter;
    'world:stage:exit': StageExit;
    'entity:missile:locked': MissileLockEntity;
    'world:stage:difficult': DifficultChange;
    'entity:mob:removed': EntityRemoved;
    'entity:boss:killed': BossKilled;
    'entity:boss:spawn': BossSpawn;
    'entity:mob:killed': MobKilled;
    'entity:mob:damage': MobDamage;
    'entity:player:dead': PlayerDead;
    'player:tech:unlock': UnlockTech;
    'player:tech:unlock_entry': UnlockTechEntry;
}