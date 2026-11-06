import type {World} from "../../world/World.ts";
import type {ItemStack} from "../ItemStack.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ServerPlayerEntity} from "../../server/entity/ServerPlayerEntity.ts";
import type {EMPWeapon} from "./EMPWeapon.ts";
import type {PhaseLasers} from "./PhaseLasers.ts";
import type {ItemProperties} from "../Item.ts";
import {spawnTeleportFx} from "../../utils/render/TeleportFx.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {WindowOverlay} from "../../effect/WindowOverlay.ts";
import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import {BossEntity} from "../../entity/mob/BossEntity.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import {AttributeModifier, Operation} from "../../component/type/AttributeModifier.ts";
import {Items} from "../Items.ts";
import {Techs} from "../../world/tech/Techs.ts";
import {EntityPredicates} from "../../world/predicate/EntityPredicates.ts";
import {ParticleEffects} from "../../effect/particle/ParticleEffects.ts";

export class VoidEnginWeapon extends SpecialWeapon {
    public static readonly DEFAULT_MODIFIER = new AttributeModifier(
        Identifier.ofVanilla('weapon.into_void'),
        0.4,
        Operation.ADD
    );
    private readonly id2EffectMap: Map<number, WindowOverlay> = null!;

    public constructor(settings: ItemProperties) {
        super(settings);
        if (isClient) this.id2EffectMap = new Map();
    }

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (this.getActive(stack)) return;
        this.setActive(stack, true);
        this.setTimeLeft(stack, this.getDuration(stack));

        if (!(attacker instanceof PlayerEntity)) return;

        stack.set(DataComponents.ANY_BOOLEAN, attacker.invulnerable);
        attacker.invulnerable = true;

        const modifier = stack.getOr(
            DataComponents.ATTRIBUTE_MODIFIERS,
            VoidEnginWeapon.DEFAULT_MODIFIER
        );
        attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.addModifier(modifier);

        if (isClient) {
            const mask = new WindowOverlay(
                '#7945ff',
                0.28,
                0.2,
                0.4,
                "screen",
            );
            world.addEffect(null, mask);
            world.addParticleVec(ParticleEffects.TELEPORT, attacker.positionRef, 12);
            this.id2EffectMap.set(attacker.getId(), mask);
            return;
        }

        if (attacker.getTechs().isUnlocked(Techs.VOID_ENERGY_EXTRACTION)) {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = attacker.getItem(emp);
            if (!stack.isEmpty()) emp.setCooldown(stack, 0);
        }

        (attacker as ServerPlayerEntity).syncStack(stack);
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
        if (holder instanceof PlayerEntity && holder.getTechs().isUnlocked(Techs.VOID_ENERGY_EXTRACTION)) {
            const laser = Items.PHASE_LASERS as PhaseLasers;
            const stack = holder.getItem(laser);
            if (stack.isEmpty()) return;
            stack.setAvailable(true);
            laser.setHeat(stack, 0);
        }
    }

    public override getCooldown(stack: ItemStack): number {
        return this.getActive(stack) ? (this.getDuration(stack) - this.getTimeLeft(stack)) : super.getCooldown(stack);
    }

    public override getMaxCooldown(stack: ItemStack): number {
        return this.getActive(stack) ? this.getDuration(stack) : super.getMaxCooldown(stack);
    }

    public override onEndFire(stack: ItemStack, world: World, attacker: Entity) {
        super.onEndFire(stack, world, attacker);
        if (attacker instanceof LivingEntity) {
            this.exitVoid(stack, world, attacker);
        }
    }

    public getActive(stack: ItemStack): boolean {
        return stack.getOr(DataComponents.FIRING, true);
    }

    public setActive(stack: ItemStack, value: boolean): void {
        stack.set(DataComponents.FIRING, value);
    }

    public getDuration(stack: ItemStack): number {
        return stack.getOr(DataComponents.EFFECT_DURATION, 0);
    }

    public getTimeLeft(stack: ItemStack): number {
        return stack.getOr(DataComponents.EFFECT_TIME_LEFT, 0);
    }

    public setTimeLeft(stack: ItemStack, value: number): void {
        stack.set(DataComponents.EFFECT_TIME_LEFT, value);
    }

    public accuratelyMaxCooldown(stack: ItemStack): number {
        return super.getMaxCooldown(stack);
    }

    public override getUiColor(): string {
        return '#7945ff';
    }

    private exitVoid(stack: ItemStack, world: World, attacker: LivingEntity, keepCooldown = true): void {
        attacker.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.removeModifierById(VoidEnginWeapon.DEFAULT_MODIFIER.id);
        this.setActive(stack, false);
        this.setTimeLeft(stack, 0);
        this.setCooldown(stack, this.getMaxCooldown(stack));

        if (!keepCooldown) {
            const used = this.getMaxCooldown(stack) - this.getCooldown(stack);
            const refund = 0;
            this.setCooldown(stack, Math.max(0, this.getMaxCooldown(stack) - Math.max(used, refund)));
        }

        if (isClient) {
            const mask = this.id2EffectMap.get(attacker.getId());
            if (mask) {
                mask.end();
                this.id2EffectMap.delete(attacker.getId());
            }
            const pos = attacker.position();
            spawnTeleportFx(world, pos, pos);
            return;
        }

        if (!(attacker instanceof PlayerEntity)) return;

        attacker.invulnerable = stack.getOr(DataComponents.ANY_BOOLEAN, false);
        stack.remove(DataComponents.ANY_BOOLEAN);

        const range = stack.getOr(DataComponents.EFFECT_RANGE, 32);
        const box = attacker.getBoundingBox().expandAll(range);
        const mobs = world.searchOtherEntities(attacker, box, EntityPredicates.MOB);
        for (const mob of mobs) {
            if (mob.isRemoved() || mob instanceof BossEntity) continue;
            mob.onDeath(world.getDamageSources().void(attacker));
        }

        (attacker as ServerPlayerEntity).syncStack(stack);

        if (attacker.getTechs().isUnlocked(Techs.VOID_DISTURBANCE)) {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = attacker.getItem(emp);
            if (stack.isEmpty()) return;

            const cd = emp.getCooldown(stack);
            emp.tryFire(stack, world, attacker);
            emp.setCooldown(stack, cd);
        }
    }
}