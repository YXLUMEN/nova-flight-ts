import {EVENTS} from "../apis/IEvents.ts";
import type {MissileEntity} from "../entity/projectile/MissileEntity.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ClientWorld} from "./ClientWorld.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {PlayerUnlockTechC2SPacket} from "../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {applyClientTech} from "../tech/apply_tech.ts";

export class ClientDefaultEvents {
    public static registryEvents(world: ClientWorld) {
        const eventBus = GeneralEventBus.getEventBus();

        eventBus.on(EVENTS.UNLOCK_TECH, event => {
            const player = NovaFlightClient.getInstance().player;
            if (!player) return;

            world.getNetworkChannel().send(new PlayerUnlockTechC2SPacket(player.getUuid(), event.id))
            applyClientTech(event.id);
        });

        eventBus.on(EVENTS.ENTITY_LOCKED, event => {
            const missile = event.missile as MissileEntity;
            if (missile.isRemoved() || !missile.getTarget()?.isPlayer()) return;

            const player = NovaFlightClient.getInstance().player;
            if (!player) return;
            player.lockedMissile.add(missile);
        });

        eventBus.on(EVENTS.ENTITY_UNLOCKED, event => {
            const target = event.lastTarget as Entity | null;
            const player = NovaFlightClient.getInstance().player;
            if (!player) return;

            if (target && target.isPlayer() && player.lockedMissile.size > 0) {
                player.lockedMissile.delete(event.missile);
            }
        });
    }
}