import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";

export class TechShipOpt implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        player.addEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 3), null);

        if (player.getTags().has('Repaired')) return;
        player.addTag('Repaired');
        player.setHealth(player.getMaxHealth());
    }

    public remove(player: ServerPlayerEntity) {
        player.removeEffect(StatusEffects.HEALTH_BOOST);
    }
}
