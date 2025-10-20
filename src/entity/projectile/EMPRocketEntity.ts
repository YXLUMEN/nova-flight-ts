import {RocketEntity} from "./RocketEntity.ts";
import {ProjectileEntity} from "./ProjectileEntity.ts";
import {MobEntity} from "../mob/MobEntity.ts";
import {pointInCircleVec2} from "../../utils/math/math.ts";
import {StatusEffectInstance} from "../effect/StatusEffectInstance.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EMPBurst} from "../../effect/EMPBurst.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class EMPRocketEntity extends RocketEntity {
    public override explosionRadius = 160;
    public override color = "#4b8bff";
    private duration = 300;

    public override explode() {
        const world = this.getWorld();
        world.getEntities().forEach(entity => {
            if (entity instanceof ProjectileEntity) {
                if (entity.getOwner() !== this.getOwner()) entity.discard();
            } else if (entity instanceof MobEntity) {
                if (!entity.isRemoved() &&
                    pointInCircleVec2(entity.getPositionRef, this.getPositionRef, this.explosionRadius)) {
                    entity.addStatusEffect(new StatusEffectInstance(StatusEffects.EMC_STATUS, this.duration, 1), null);
                }
            }
        });

        if (!world.isClient) {
            (world as ServerWorld).spawnEffect(null, new EMPBurst(
                this.getPosition(),
                this.explosionRadius,
            ));
        }
        world.playSound(null, SoundEvents.EMP_BURST);
    }
}