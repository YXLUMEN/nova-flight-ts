import {EVENTS} from "../type/IEvents.ts";
import type {ClientWorld} from "./ClientWorld.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {PlayerUnlockTechC2SPacket} from "../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {Tech} from "../world/tech/Tech.ts";
import {Registries} from "../registry/Registries.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {DevourerBoss} from "../entity/mob/DevourerBoss.ts";
import {ClientTechManager} from "./tech/ClientTechManager.ts";

export class ClientDefaultEvents {
    public static registryEvents(world: ClientWorld) {
        const events = GeneralEventBus.getEventBus();

        events.on(EVENTS.GAME_START, () => {
            void BGMManager.onGameStart();
        });

        events.on(EVENTS.GAME_END, () => {
            BGMManager.playMainTheme();
        });

        events.on(EVENTS.GAME_OVER, () => {
            BGMManager.onGameOver();
        });

        events.on(EVENTS.UNLOCK_TECH, ({tech, silent}) => {
            const player = NovaFlightClient.getInstance().player;
            if (!player) return;
            BGMManager.onTechUnlock(player);

            if (tech instanceof Tech) {
                const entry = Registries.TECH.getEntryByValue(tech);
                if (!entry) throw new Error(`Tech not found: ${tech})`);

                if (!silent) world.sendPacket(new PlayerUnlockTechC2SPacket(entry));
                ClientTechManager.apply(entry, player);
            }
        });

        events.on(EVENTS.ENTITY_LOCKED, ({missile}) => {
            const target = missile.getTarget();
            if (missile.isRemoved() || !target || !target.isPlayer()) return;

            const player = NovaFlightClient.getInstance().player;
            if (!player || target !== player) return;
            player.lockedMissile.add(missile);
        });

        events.on(EVENTS.DIFFICULT_CHANGE, event => {
            BGMManager.onDifficultRaise(event.difficult);
        });

        events.on(EVENTS.BOSS_SPAWN, ({entity}) => {
            if (entity instanceof DevourerBoss) return;
            BGMManager.onBossSpawn();
        });

        events.on(EVENTS.BOSS_KILLED, () => {
            BGMManager.onBossDead();
        });
    }
}