import {EventBus} from "../event/EventBus.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {PlayerUnlockTechC2SPacket} from "../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {Registries} from "../registry/Registries.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {DevourerBoss} from "../entity/mob/DevourerBoss.ts";
import {ClientTechManager} from "./tech/ClientTechManager.ts";
import type {LocalPlayerEntity} from "./entity/LocalPlayerEntity.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";

export class ClientDefaultEvents {
    public static registryEvents() {
        const events = EventBus.instance();

        events.on('player:tech:unlock', event => {
            const {tech, silent} = event;
            const player = event.player as LocalPlayerEntity;

            const entry = Registries.TECH.getEntryByValue(tech);
            if (!entry) throw new Error(`Tech not found: ${tech})`);

            if (!silent) player.sendPacket(new PlayerUnlockTechC2SPacket(entry));
            ClientTechManager.apply(entry, player);
        });

        events.on('entity:missile:locked', ({missile}) => {
            const target = missile.getTarget();
            if (missile.isRemoved() || !target || !target.isPlayer()) return;

            const player = NovaFlightClient.getInstance().player;
            if (!player || target !== player) return;
            player.lockedMissile.add(missile);
        });

        events.on('entity:boss:spawn', ({boss}) => {
            if (boss instanceof DevourerBoss) {
                void AudioManager.play(Audios.SCOURGE_OF_THE_UNIVERSE, true);
                return;
            }
            void BGMManager.onBossSpawn();
        });
    }
}