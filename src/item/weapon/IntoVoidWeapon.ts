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
import {Items} from "../items.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";

export class IntoVoidWeapon extends SpecialWeapon {
    public static readonly displayName = "遁入虚空";
    public static readonly uiColor = "#7945ff";

    public readonly modifier = {id: Identifier.ofVanilla('weapon.into_void'), value: 0.4};

    private prevInvincible = false;

    private mask: WindowOverlay | null = null;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (this.getActive(stack)) return;

        this.setActive(stack, true);
        this.setTimeLeft(stack, this.getDuration(stack));

        if (attacker instanceof PlayerEntity) {
            this.prevInvincible = attacker.invulnerable;
            attacker.invulnerable = true;
            attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.addModifier(this.modifier);

            this.mask = new WindowOverlay({
                color: IntoVoidWeapon.uiColor,
                maxAlpha: 0.28,
                fadeIn: 0.2,
                fadeOut: 0.4,
                composite: "screen",
            });
            world.addEffect(this.mask);

            if (attacker.techTree.isUnlocked('void_energy_extraction')) {
                const emp = Items.EMP_WEAPON as EMPWeapon;
                const stack = attacker.weapons.get(emp);
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
        if (holder instanceof PlayerEntity && holder.techTree.isUnlocked('void_energy_extraction')) {
            const laser = Items.LASER_WEAPON as LaserWeapon;
            const stack = holder.weapons.get(laser);
            if (stack) laser.instantCooldown(stack);
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

    public trueMaxCooldown(stack: ItemStack): number {
        return super.getMaxCooldown(stack);
    }

    public override getDisplayName(): string {
        return IntoVoidWeapon.displayName;
    }

    public override getUiColor(): string {
        return IntoVoidWeapon.uiColor;
    }

    private exitVoid(stack: ItemStack, world: World, owner: LivingEntity, keepCooldown = true): void {
        owner.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.removeModifierById(this.modifier.id);
        this.setActive(stack, false);
        this.setTimeLeft(stack, 0);
        this.setCooldown(stack, this.getMaxCooldown(stack));

        if (this.mask) {
            this.mask.end();
            this.mask = null;
        }

        if (!keepCooldown) {
            const used = this.getMaxCooldown(stack) - this.getCooldown(stack);
            const refund = 0;
            this.setCooldown(stack, Math.max(0, this.getMaxCooldown(stack) - Math.max(used, refund)));
        }

        if (!(owner instanceof PlayerEntity)) return;

        owner.invulnerable = this.prevInvincible;
        this.prevInvincible = false;

        const box = owner.getEntityDimension().width + stack.getOrDefault(DataComponentTypes.VOID_DAMAGE_RANGE, 32);
        for (const mob of world.getLoadMobs()) {
            if (mob.isRemoved() || !pointInCircleVec2(owner.getPositionRef, mob.getPositionRef, box + mob.getEntityDimension().width)) continue;
            if (mob instanceof BossEntity) continue;
            mob.onDeath(world.getDamageSources().void(owner as PlayerEntity));
        }

        if (owner.techTree.isUnlocked('void_disturbance')) {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = owner.weapons.get(emp);
            if (stack) {
                const cd = emp.getCooldown(stack);
                emp.tryFire(stack, world, owner);
                emp.setCooldown(stack, cd);
            }
        }
    }
}