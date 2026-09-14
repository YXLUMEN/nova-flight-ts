import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";

export abstract class AbstractClientPlayerEntity extends PlayerEntity {
    protected override tickEffects() {
        super.tickEffects();
        for (const effect of this.getStatusEffects()) {
            effect.tickClient();
        }
    }
}