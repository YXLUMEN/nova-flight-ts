import {EVENTS} from "../apis/IEvents.ts";
import type {MissileEntity} from "../entity/projectile/MissileEntity.ts";
import type {ClientWorld} from "./ClientWorld.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {PlayerUnlockTechC2SPacket} from "../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {ApplyClientTech} from "./tech/ApplyClientTech.ts";
import {Tech} from "../tech/Tech.ts";
import {Registries} from "../registry/Registries.ts";
import {BGMManager} from "../sound/BGMManager.ts";

export class ClientDefaultEvents {
    public static registryEvents(world: ClientWorld) {
        const events = GeneralEventBus.getEventBus();

        events.on(EVENTS.GAME_START, () => {
            BGMManager.onGameStart().then();
        });

        events.on(EVENTS.GAME_OVER, () => {
            BGMManager.onGameOver();
        });

        events.on(EVENTS.UNLOCK_TECH, event => {
            const player = NovaFlightClient.getInstance().player;
            if (!player) return;
            BGMManager.onTechUnlock(player);

            const tech = event.tech;

            if (tech instanceof Tech) {
                const entry = Registries.TECH.getEntryByValue(tech);
                if (!entry) throw new Error(`Tech not found: ${tech})`);

                world.getNetworkChannel().send(new PlayerUnlockTechC2SPacket(entry));
                ApplyClientTech.apply(entry);
            }
        });

        events.on(EVENTS.ENTITY_LOCKED, event => {
            const missile = event.missile as MissileEntity;
            const target = missile.getTarget();
            if (missile.isRemoved() || !target || !target.isPlayer()) return;

            const player = NovaFlightClient.getInstance().player;
            if (!player || target !== player) return;
            player.lockedMissile.add(missile);
        });

        events.on(EVENTS.DIFFICULT_CHANGE, event => {
            BGMManager.onDifficultRaise(event.difficult);
        });

        events.on(EVENTS.BOSS_SPAWN, () => {
            BGMManager.onBossSpawn();
        });

        events.on(EVENTS.BOSS_KILLED, () => {
            BGMManager.onBossDead();
        });
    }
}