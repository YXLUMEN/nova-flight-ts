import {World} from "../../world/World.ts";
import {EMPBurst} from "../../effect/EMPBurst.ts";
import {pointInCircleVec2} from "../../utils/math/math.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {MobEntity} from "../../entity/mob/MobEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {ProjectileEntity} from "../../entity/projectile/ProjectileEntity.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";

export class EMPWeapon extends SpecialWeapon {
    private readonly duration = 600;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        world.events.emit(EVENTS.EMP_BURST, {duration: this.duration});
        const radius = stack.getOrDefault(DataComponentTypes.EFFECT_RANGE, 480);

        world.getEntities().forEach(entity => {
            if (entity instanceof ProjectileEntity) {
                if (entity.getOwner() !== attacker) entity.discard();
            } else if (entity instanceof MobEntity) {
                if (!entity.isRemoved() &&
                    pointInCircleVec2(entity.getPositionRef, attacker.getPositionRef, radius)) {
                    entity.addStatusEffect(new StatusEffectInstance(StatusEffects.EMC_STATUS, this.duration, 1), null);
                }
            }
        });

        world.addEffect(new EMPBurst(
            attacker.getPositionRef,
            radius
        ));
        world.playSound(SoundEvents.EMP_BURST);

        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    public bindKey(): string {
        return 'Digit2';
    }

    public override getDisplayName(): string {
        return 'EMP';
    }

    public override getUiColor(): string {
        return '#5ec8ff'
    }
}