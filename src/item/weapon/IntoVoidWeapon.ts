import {World} from "../../world/World.ts";
import {WindowOverlay} from "../../effect/WindowOverlay.ts";
import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import {pointInCircleVec2} from "../../utils/math/math.ts";
import {EMPWeapon} from "./EMPWeapon.ts";
import {LaserWeapon} from "./LaserWeapon.ts";
import {BossEntity} from "../../entity/mob/BossEntity.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {type Entity} from "../../entity/Entity.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import {AttributeModifiersComponent} from "../../component/type/AttributeModifiersComponent.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {Items} from "../Items.ts";

const id2EffectMap = new Map<number, WindowOverlay>();

export class IntoVoidWeapon extends SpecialWeapon {
    public static readonly displayName = "遁入虚空";
    public static readonly uiColor = "#7945ff";

    public static readonly DEFAULT_MODIFIER = new AttributeModifiersComponent(
        Identifier.ofVanilla('weapon.into_void'),
        0.4
    );

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (this.getActive(stack)) return;

        this.setActive(stack, true);
        this.setTimeLeft(stack, this.getDuration(stack));

        if (attacker instanceof PlayerEntity) {
            stack.set(DataComponentTypes.ANY_BOOLEAN, attacker.invulnerable);
            attacker.invulnerable = true;

            const modifier = stack.getOrDefault(
                DataComponentTypes.ATTRIBUTE_MODIFIERS,
                IntoVoidWeapon.DEFAULT_MODIFIER
            );
            attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.addModifier(modifier);

            const mask = new WindowOverlay(
                IntoVoidWeapon.uiColor,
                0.28,
                0.2,
                0.4,
                "screen",
            );
            world.addEffect(null, mask);
            id2EffectMap.set(attacker.getId(), mask);

            if (attacker.getTechs().isUnlocked('void_energy_extraction')) {
                const emp = Items.EMP_WEAPON as EMPWeapon;
                const stack = attacker.getItem(emp);
                if (stack) emp.setCooldown(stack, 0);
            }
        }
    }

    public override canFire(stack: ItemStack): boolean {
        return !this.getActive(stack) && this.getCooldown(stack) <= 0;
    }

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity): void {
        super.inventoryTick(stack, world, holder);

        if (!this.getActive(stack)) return;

        this.setTimeLeft(stack, this.getTimeLeft(stack) - 1);
        if (this.getTimeLeft(stack) <= 0 && holder instanceof LivingEntity) {
            this.exitVoid(stack, holder.getWorld(), holder);
        }
        if (holder instanceof PlayerEntity && holder.getTechs().isUnlocked('void_energy_extraction')) {
            const laser = Items.LASER_WEAPON as LaserWeapon;
            const stack = holder.getItem(laser);
            if (stack) stack.setAvailable(true);
        }
    }

    public override bindKey(): string {
        return "Digit4";
    }

    public override getCooldown(stack: ItemStack): number {
        return this.getActive(stack) ? (this.getDuration(stack) - this.getTimeLeft(stack)) : super.getCooldown(stack);
    }

    public override getMaxCooldown(stack: ItemStack): number {
        return this.getActive(stack) ? this.getDuration(stack) : super.getMaxCooldown(stack);
    }

    public getActive(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.ACTIVE, true);
    }

    public setActive(stack: ItemStack, value: boolean): void {
        stack.set(DataComponentTypes.ACTIVE, value);
    }

    public getDuration(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.EFFECT_DURATION, 0);
    }

    public setDuration(stack: ItemStack, value: number): void {
        stack.set(DataComponentTypes.EFFECT_DURATION, value);
    }

    public getTimeLeft(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.EFFECT_TIME_LEFT, 0);
    }

    public setTimeLeft(stack: ItemStack, value: number): void {
        stack.set(DataComponentTypes.EFFECT_TIME_LEFT, value);
    }

    public accuratelyMaxCooldown(stack: ItemStack): number {
        return super.getMaxCooldown(stack);
    }

    public override getDisplayName(): string {
        return IntoVoidWeapon.displayName;
    }

    public override getUiColor(): string {
        return IntoVoidWeapon.uiColor;
    }

    private exitVoid(stack: ItemStack, world: World, attacker: LivingEntity, keepCooldown = true): void {
        attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.removeModifierById(IntoVoidWeapon.DEFAULT_MODIFIER.id);
        this.setActive(stack, false);
        this.setTimeLeft(stack, 0);
        this.setCooldown(stack, this.getMaxCooldown(stack));

        const mask = id2EffectMap.get(attacker.getId());
        if (mask) {
            mask.end();
            id2EffectMap.delete(attacker.getId());
        }

        if (!keepCooldown) {
            const used = this.getMaxCooldown(stack) - this.getCooldown(stack);
            const refund = 0;
            this.setCooldown(stack, Math.max(0, this.getMaxCooldown(stack) - Math.max(used, refund)));
        }

        if (!(attacker instanceof PlayerEntity)) return;

        attacker.invulnerable = stack.getOrDefault(DataComponentTypes.ANY_BOOLEAN, false);
        stack.set(DataComponentTypes.ANY_BOOLEAN, false);

        if (!world.isClient) {
            const box = attacker.getWidth() + stack.getOrDefault(DataComponentTypes.EFFECT_RANGE, 32);
            for (const mob of (world as ServerWorld).getMobs()) {
                if (mob.isRemoved() || !pointInCircleVec2(attacker.getPositionRef, mob.getPositionRef, box + mob.getWidth())) continue;
                if (mob instanceof BossEntity) continue;
                mob.onDeath(world.getDamageSources().void(attacker as PlayerEntity));
            }
        }

        if (attacker.getTechs().isUnlocked('void_disturbance')) {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = attacker.getItem(emp);
            if (stack) {
                const cd = emp.getCooldown(stack);
                emp.tryFire(stack, world, attacker);
                emp.setCooldown(stack, cd);
            }
        }
    }
}