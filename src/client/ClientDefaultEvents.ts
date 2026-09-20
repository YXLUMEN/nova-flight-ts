import {appEvent} from "../event/EventBus.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {PlayerUnlockTechC2SPacket} from "../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {Registries} from "../registry/Registries.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {DevourerBoss} from "../entity/mob/DevourerBoss.ts";
import {ClientTechManager} from "./tech/ClientTechManager.ts";
import type {LocalPlayerEntity} from "./entity/LocalPlayerEntity.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";
import {MissileLockVisual} from "./entity/MissileLockVisual.ts";

export class ClientDefaultEvents {
    public static registryEvents() {
        appEvent.on('player:tech:unlock', event => {
            const {tech, silent} = event;
            const player = event.player as LocalPlayerEntity;

            const entry = Registries.TECH.getEntryByValue(tech);
            if (!entry) throw new Error(`Tech not found: ${tech})`);

            if (!silent) player.sendPacket(new PlayerUnlockTechC2SPacket(entry));
            ClientTechManager.apply(entry, player);
        });

        const lockVisual = new MissileLockVisual();
        appEvent.on('entity:missile:locked', ({missile, target, lastTarget}) => {
            if (missile.isRemoved() || !target) {
                lockVisual.onMiss(missile, lastTarget);
                return;
            }

            if (target.isPlayer()) {
                const player = NovaFlightClient.instance().player;
                if (!player || target !== player) return;
                player.lockedMissile.add(missile);
                return;
            }

            if (missile.getOwner()?.isPlayer()) {
                lockVisual.onTarget(missile, target);
            }
        });

        appEvent.on('entity:boss:spawn', ({boss}) => {
            if (boss instanceof DevourerBoss) {
                void AudioManager.play(Audios.SCOURGE_OF_THE_UNIVERSE, true);
                return;
            }
            void BGMManager.onBossSpawn();
        });
    }
}