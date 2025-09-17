import {RocketEntity} from "./RocketEntity.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";
import {MobEntity} from "../mob/MobEntity.ts";
import {pointInCircleVec2} from "../../utils/math/math.ts";
import {StatusEffectInstance} from "../effect/StatusEffectInstance.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EMPBurst} from "../../effect/EMPBurst.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";

export class EMPRocketEntity extends RocketEntity {
    public override explosionRadius = 160;
    private duration = 300;
    public override color = "#4b8bff";


    public override explode() {
        const world = this.getWorld();
        world.getEntities().forEach(entity => {
            if (entity instanceof ProjectileEntity) {
                if (entity.owner instanceof MobEntity) entity.discard();
            } else if (entity instanceof MobEntity) {
                if (!entity.isRemoved() && pointInCircleVec2(entity.getPositionRef, this.getPositionRef, this.explosionRadius)) {
                    entity.addStatusEffect(new StatusEffectInstance(StatusEffects.EMC_STATUS, this.duration, 1), null);
                }
            }
        });

        world.addEffect(new EMPBurst(
            this.getPosition(),
            this.explosionRadius,
        ));
        SoundSystem.playSound(SoundEvents.EMP_BURST);
    }
}