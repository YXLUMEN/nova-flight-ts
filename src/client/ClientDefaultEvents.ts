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

        events.on('game:start', () => {
            void BGMManager.onGameStart();
        });

        events.on('game:end', () => {
            BGMManager.playMainTheme();
        });

        events.on('game:over', () => {
            BGMManager.onGameOver();
        });

        events.on('player:tech:unlock', ({tech, silent}) => {
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

        events.on('entity:missile:locked', ({missile}) => {
            const target = missile.getTarget();
            if (missile.isRemoved() || !target || !target.isPlayer()) return;

            const player = NovaFlightClient.getInstance().player;
            if (!player || target !== player) return;
            player.lockedMissile.add(missile);
        });

        events.on('world:stage:difficult', event => {
            BGMManager.onDifficultRaise(event.difficult);
        });

        events.on('entity:boss:spawn', ({boss}) => {
            if (boss instanceof DevourerBoss) return;
            BGMManager.onBossSpawn();
        });

        events.on('entity:boss:killed', () => {
            BGMManager.onBossDead();
        });
    }
}