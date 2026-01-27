import {type ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import {type World} from "../../world/World.ts";
import {type Entity} from "../../entity/Entity.ts";
import type {ClientWorld} from "../../client/ClientWorld.ts";
import {ClientEffect} from "../../utils/ClientEffect.ts";
import {PhaseLasers} from "./PhaseLasers.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {thickLineCircleHit} from "../../utils/math/math.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {AttributeModifiersComponent} from "../../component/type/AttributeModifiersComponent.ts";

export class PerditionBeam extends PhaseLasers {
    private static readonly DEFAULT_MODIFIER = new AttributeModifiersComponent(
        Identifier.ofVanilla('perdition_beam_charging'),
        -0.7
    );
    protected override width = 12;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (this.getActive(stack)) return;

        if (stack.getOrDefault(DataComponentTypes.SCHEDULE_FIRE, false)) {
            stack.set(DataComponentTypes.SCHEDULE_FIRE, false);
            stack.set(DataComponentTypes.CHARGING_PROGRESS, 0);
            if (attacker instanceof LivingEntity) {
                const instance = attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED);
                if (instance) instance.removeModifier(PerditionBeam.DEFAULT_MODIFIER);
            }

            if (world.isClient) {
                world.stopLoopSound(attacker, SoundEvents.LASER_CHARGE_UP_LONG);
                world.playSound(attacker, SoundEvents.LASER_CHARGE_DOWN);
            }
            return;
        }

        stack.set(DataComponentTypes.SCHEDULE_FIRE, true);
        stack.set(DataComponentTypes.CHARGING_PROGRESS, 60);

        if (world.isClient) {
            world.playLoopSound(attacker, SoundEvents.LASER_CHARGE_UP_LONG);
        } else if (attacker instanceof LivingEntity) {
            const instance = attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            if (instance) instance.addModifier(PerditionBeam.DEFAULT_MODIFIER);
        }
    }

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity) {
        if (stack.getOrDefault(DataComponentTypes.SCHEDULE_FIRE, false)) {
            const charging = stack.getOrDefault(DataComponentTypes.CHARGING_PROGRESS, 0) - 1;
            if (charging <= 0) {
                this.setActive(stack, true);
                stack.set(DataComponentTypes.SCHEDULE_FIRE, false);
                this.onStartFire(stack, world, holder);
            } else if (world.isClient) {
                ClientEffect.spawnChargingParticles(world as ClientWorld, holder, 4, '#ff8282', '#ff0a0a');
            }

            stack.set(DataComponentTypes.CHARGING_PROGRESS, Math.max(charging, 0));
            return;
        }

        super.inventoryTick(stack, world, holder);
    }

    protected damage(world: ServerWorld, stack: ItemStack, holder: Entity, start: IVec, end: IVec) {
        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
        const damageSource = world.getDamageSources()
            .laser(holder)
            .setHealthMulti(4)
            .setShieldMulti(0.8);

        for (const mob of world.getMobs()) {
            const pos = mob.getPositionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                this.width,
                pos.x, pos.y, mob.getWidth())) {
                mob.takeDamage(damageSource, damage);
                if (mob.getShieldAmount() > 0) continue;
                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 80, 10), holder);
            }
        }

        for (const project of (world as ServerWorld).getProjectiles()) {
            if (project.getOwner() === holder) continue;
            const pos = project.getPositionRef;
            if (thickLineCircleHit(
                start.x, start.y, end.x, end.y, this.width,
                pos.x, pos.y, project.getWidth())) {
                project.onIntercept(50);
            }
        }
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;

        world.stopLoopSound(attacker, SoundEvents.LASER_CHARGE_UP_LONG);

        world.playSound(attacker, SoundEvents.LASER_FIRE_SYNTH);
        world.playLoopSound(attacker, SoundEvents.LASER_BEAM, 0.8);
    }

    public override onEndFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (attacker instanceof LivingEntity) {
            const instance = attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            if (instance) instance.removeModifier(PerditionBeam.DEFAULT_MODIFIER);
        }

        world.stopLoopSound(attacker, SoundEvents.LASER_BEAM);

        world.playSound(attacker, SoundEvents.STEAM_RELEASE);
        world.playSound(attacker, SoundEvents.LASER_SPINDOWN);
    }

    protected override overHeatAlert() {
    }

    public override getDisplayName(): string {
        return '炼狱射线';
    }

    public override getUiColor(): string {
        return '#ff4927';
    }
}