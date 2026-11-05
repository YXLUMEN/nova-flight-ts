import type {LocalPlayerEntity} from "./entity/LocalPlayerEntity.ts";
import {appEvent} from "../event/EventBus.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {PlayerUnlockTechC2SPacket} from "../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {Registries} from "../registry/Registries.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {DevourerBoss} from "../entity/mob/DevourerBoss.ts";
import {ClientTechManager} from "./tech/ClientTechManager.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";
import {MissileLockVisual} from "./entity/MissileLockVisual.ts";
import {ZoneWarningEffect} from "../effect/ZoneWarningEffect.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {World} from "../world/World.ts";

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

        let zone: ZoneWarningEffect | null = null;
        appEvent.on('world:stage:enter', ({world, name}) => {
            world.playSound(null, SoundEvents.PHASE_CHANGE);

            if (name === 'P8' || name === 'P9') {
                zone?.kill();
                zone = null;
                return;
            }

            if (zone) return;
            zone = new ZoneWarningEffect(World.MAP_WIDTH, -88);
            world.addEffect(null, zone);
            return;
        });

        appEvent.on('game:end', () => {
            zone?.kill();
            zone = null;
        });
    }
}