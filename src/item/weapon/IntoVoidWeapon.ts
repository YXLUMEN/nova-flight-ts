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

export class IntoVoidWeapon extends SpecialWeapon {
    public static readonly displayName = "遁入虚空";
    public static readonly uiColor = "#7945ff";

    public readonly modifier = {id: Identifier.ofVanilla('weapon.into_void'), value: 0.4};
    public radius = 32;
    public duration = 250;
    private active = false;
    private timeLeft = 0;
    private prevInvincible = false;

    private mask: WindowOverlay | null = null;

    public override tryFire(_stack: ItemStack, world: World, attacker: Entity): void {
        if (this.active) return;

        this.active = true;
        this.timeLeft = this.duration;

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
        return !this.active && this.getCooldown(stack) <= 0;
    }

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity): void {
        super.inventoryTick(stack, world, holder);

        if (!this.active) return;

        this.timeLeft -= 1;
        if (this.timeLeft <= 0 && holder instanceof LivingEntity) {
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
        return this.active ? (this.duration - this.timeLeft) : super.getCooldown(stack);
    }

    public override getMaxCooldown(stack: ItemStack): number {
        return this.active ? this.duration : super.getMaxCooldown(stack);
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
        this.active = false;
        this.timeLeft = 0;
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

        const box = owner.getEntityDimension().width + this.radius;
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