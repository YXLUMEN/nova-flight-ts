import type {World} from "../world/World.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntitySpawnS2CPacket} from "../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {StatusEffect} from "./effect/StatusEffect.ts";
import type {EntityType} from "./EntityType.ts";
import type {Attribute} from "./attribute/Attribute.ts";
import type {AttributeInstance} from "./attribute/AttributeInstance.ts";
import type {NbtCompound} from "../nbt/element/NbtCompound.ts";
import {clamp, PI2} from "../utils/math/math.ts";
import {Entity} from "./Entity.ts";
import {StatusEffectInstance} from "./effect/StatusEffectInstance.ts";
import {DataTracker, type DataTrackerBuilder} from "./data/DataTracker.ts";
import {AttributeMap} from "./attribute/AttributeMap.ts";
import {EntityAttributes} from "./attribute/EntityAttributes.ts";
import {AttributeSupplier, type AttributeSupplierBuilder} from "./attribute/AttributeSupplier.ts";
import {TrackedDataHandlerRegistry} from "./data/TrackedDataHandlerRegistry.ts";
import {EntityDamageS2CPacket} from "../network/packet/s2c/EntityDamageS2CPacket.ts";
import {DamageTypeTags} from "../registry/tag/DamageTypeTags.ts";
import {StatusEffects} from "./effect/StatusEffects.ts";
import {NbtTypeId} from "../nbt/NbtType.ts";
import {Techs} from "../world/tech/Techs.ts";
import {DamageTypes} from "./damage/DamageTypes.ts";
import {PlayerEntity} from "./player/PlayerEntity.ts";
import {isClient} from "../configs/RuntimeConfig.ts";
import {InterpolationHandler} from "../world/entity/InterpolationHandler.ts";


export abstract class LivingEntity extends Entity {
    private static readonly DATA_HEALTH = DataTracker.registerData(
        Object(LivingEntity), TrackedDataHandlerRegistry.FLOAT
    );

    private static readonly DATA_EFFECT = DataTracker.registerData(
        Object(LivingEntity), TrackedDataHandlerRegistry.STATUE_EFFECTS
    );

    private shieldAmount: number = 0;
    private effectsDirty: boolean = true;

    private readonly interpolation: InterpolationHandler | null;
    private readonly attributes: AttributeMap;
    // noop in client, except local player
    private readonly activeEffects: Map<RegistryEntry<StatusEffect>, StatusEffectInstance> = new Map();

    protected constructor(type: EntityType<LivingEntity>, world: World) {
        super(type, world);

        this.interpolation = isClient ? new InterpolationHandler(this) : null;
        this.attributes = new AttributeMap(this.createLivingAttributes().build(type));
        this.setHealth(this.getMaxHealth());
    }

    public createLivingAttributes(): AttributeSupplierBuilder {
        return AttributeSupplier.builder()
            .add(EntityAttributes.GENERIC_MAX_HEALTH)
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED)
            .add(EntityAttributes.GENERIC_MAX_SHIELD);
    }

    protected override defineSyncedData(builder: DataTrackerBuilder): void {
        builder.define(LivingEntity.DATA_HEALTH, 1);
        builder.define(LivingEntity.DATA_EFFECT, []);
    }

    public override tick() {
        super.tick();

        if (!this.isRemoved()) {
            this.aiStep();
        }

        this.tickEffects();
    }

    protected aiStep() {
        if (this.isInterpolating()) {
            this.getInterpolation()!.interpolate();
        } else if (!this.isLogicalSide()) {
            this.setDeltaMovement(this.getX(), this.getY());
        }

        const velocity = this.velocityRef.multiply(0.9);
        const vx = Math.abs(velocity.x) < 0.003 ? 0 : velocity.x;
        const vy = Math.abs(velocity.y) < 0.003 ? 0 : velocity.y;
        velocity.set(vx, vy);

        if (this.canMoveVoluntarily()) {
            this.tickAi();
        }

        while (this.getYaw() - this.prevYaw < -Math.PI) {
            this.prevYaw -= PI2;
        }

        while (this.getYaw() - this.prevYaw >= Math.PI) {
            this.prevYaw += PI2;
        }

        this.tickCramming();
    }

    protected tickAi(): void {
    }

    protected tickCramming(): void {
        if (isClient) return;
        const entities = this.getWorld()
            .searchOtherEntities(this, this.getBoundingBox(), entity => entity.isPushAble())
            .take(32); // 过多实体进行挤压反而观察不出挤压效果,并且开销过大
        for (const entity of entities) {
            this.pushAwayFrom(entity);
        }
    }

    public override isPushAble(): boolean {
        return this.isAlive();
    }

    /** 重写时必须调用 */
    protected override onDiscard(): void {
        for (const instance of this.getStatusEffects()) {
            instance.onEntityRemoved(this);
        }
        this.activeEffects.clear();
        super.onDiscard();
    }

    // 实体属性

    public getAttributes(): AttributeMap {
        return this.attributes;
    }

    public getAttributeInstance(attribute: RegistryEntry<Attribute>): AttributeInstance | null {
        return this.attributes.getInstance(attribute);
    }

    public getAttributeValue(attribute: RegistryEntry<Attribute>): number {
        return this.attributes.getValue(attribute);
    }

    public getAttributeBaseValue(attribute: RegistryEntry<Attribute>): number {
        return this.attributes.getBaseValue(attribute);
    }

    private onAttributeUpdated(): void {
        const pendingAttr = this.attributes.getPendingUpdate();
        for (const attr of pendingAttr) {
            this.updateAttribute(attr.getAttribute());
        }

        pendingAttr.clear();
    }

    private updateAttribute(attribute: RegistryEntry<Attribute>): void {
        if (attribute.match(EntityAttributes.GENERIC_MAX_HEALTH)) {
            const maxHealth = this.getMaxHealth();
            if (this.getHealth() > maxHealth) {
                this.setHealth(maxHealth);
            }
        } else if (attribute.match(EntityAttributes.GENERIC_MAX_SHIELD)) {
            const maxShield = this.getMaxShield();
            if (this.getShieldAmount() > maxShield) {
                this.setShieldAmount(maxShield);
            }
        }
    }

    // 生命与护盾

    public getMaxHealth(): number {
        return this.getAttributeValue(EntityAttributes.GENERIC_MAX_HEALTH);
    }

    public getHealth(): number {
        return this.dataTracker.get(LivingEntity.DATA_HEALTH);
    }

    public setHealth(health: number): void {
        this.dataTracker.set(LivingEntity.DATA_HEALTH, clamp(health, 0, this.getMaxHealth()));
    }

    public getMaxShield(): number {
        return this.getAttributeValue(EntityAttributes.GENERIC_MAX_SHIELD);
    }

    public getShieldAmount(): number {
        return this.shieldAmount;
    }

    /** @readonly **Do not override** */
    public setShieldAmount(amount: number): void {
        this.setShieldAmountUnclamped(clamp(amount, 0, this.getMaxShield()));
    }

    protected setShieldAmountUnclamped(amount: number) {
        this.shieldAmount = amount;
    }

    public override isAlive() {
        return !this.isRemoved() && this.getHealth() > 0.0;
    }

    public isDead(): boolean {
        return this.getHealth() <= 0.0;
    }

    public heal(amount: number) {
        const health = this.getHealth();
        if (health > 0) {
            this.setHealth(health + amount);
        }
    }

    protected modifyAppliedDamage(source: DamageSource, damage: number): number {
        if (source.isIn(DamageTypeTags.BYPASSES_EFFECTS)) {
            return damage;
        }

        const attacker = source.getAttacker();
        if (attacker instanceof PlayerEntity &&
            source.isOfs(DamageTypes.MOB_PROJECTILE, DamageTypes.KINETIC, DamageTypes.PLAYER_ATTACK) &&
            attacker.getTechs().isUnlocked(Techs.ANTIMATTER_WARHEAD)
        ) {
            damage += Math.floor(this.getHealth() * 0.08);
        }

        if (this.hasStatusEffect(StatusEffects.RESISTANCE) && !source.isIn(DamageTypeTags.BYPASSES_RESISTANCE)) {
            const reduce = this.getStatusEffect(StatusEffects.RESISTANCE)!.amplifier();
            const percent = (8 - reduce) * 0.1;
            damage = Math.max(0, damage * percent);
        }

        return damage > 1E-5 ? damage : 0;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;
        if (isClient) return false;
        if (this.isDead()) return false;

        damage = this.modifyAppliedDamage(damageSource, damage);
        let remain = damage;

        const world = this.getWorld();
        const shieldAmount = this.getShieldAmount();

        if (shieldAmount > 0 && !damageSource.isIn(DamageTypeTags.BYPASSES_SHIELD)) {
            const hitShield = damage * damageSource.getShieldMulti();

            remain = Math.max(hitShield - shieldAmount, 0);
            this.setShieldAmount(shieldAmount - hitShield + remain);

            if (hitShield > 0) {
                world.sendPacket(EntityDamageS2CPacket.fromEntity(this, hitShield, '#73c4ff'));
            }
        }

        if (remain > 0) {
            remain *= damageSource.getHealthMulti();

            this.setHealth(this.getHealth() - remain);
            for (const effect of this.getStatusEffects()) {
                effect.onEntityDamage(this, damageSource, remain);
            }
            if (this.isDead()) this.onDeath(damageSource);

            world.sendPacket(EntityDamageS2CPacket.fromEntity(this, remain));
        }

        if (damage === 0) {
            world.sendPacket(EntityDamageS2CPacket.fromEntity(this, 0, '#979797'));
        }

        return true;
    }

    // 状态效果

    protected tickEffects(): void {
        if (isClient) {
            const dataEffects = this.dataTracker.get(LivingEntity.DATA_EFFECT);
            for (const effect of dataEffects) {
                effect.getValue().clientVisual(this);
            }
            return;
        }

        for (const [type, effect] of this.activeEffects) {
            if (!effect.tickServer(this)) {
                this.activeEffects.delete(type);
                this.onEffectRemoved(effect);
            }
        }
    }

    public getStatusEffects(): MapIterator<StatusEffectInstance> {
        return this.activeEffects.values();
    }

    public getActiveStatusEffects(): Map<RegistryEntry<StatusEffect>, StatusEffectInstance> {
        return this.activeEffects;
    }

    public hasStatusEffect(effect: RegistryEntry<StatusEffect>): boolean {
        return this.activeEffects.has(effect);
    }

    public getStatusEffect(effect: RegistryEntry<StatusEffect>): StatusEffectInstance | undefined {
        return this.activeEffects.get(effect);
    }

    public canHaveEffect(_effect: StatusEffectInstance): boolean {
        return true;
    }

    public addStatusEffect(effect: StatusEffectInstance, source: Entity | null): boolean {
        if (!this.canHaveEffect(effect)) return false;

        const type = effect.type();
        const instance = this.activeEffects.get(type);

        if (!instance) {
            effect.source = source;
            this.activeEffects.set(type, effect);
            this.onEffectAdded(effect, source);
            effect.onApplied(this);
            effect.onEffectStarted(this);
            return true;
        }

        const upgraded = instance.upgrade(effect);
        if (upgraded) {
            instance.source = source;
            this.onEffectUpdated(instance, true, source);
        }
        effect.onEffectStarted(this);
        return upgraded;
    }

    public setStatusEffect(effect: StatusEffectInstance, source: Entity | null): void {
        if (!this.canHaveEffect(effect)) return;

        const previous = this.activeEffects.has(effect.type());
        this.activeEffects.set(effect.type(), effect);
        if (previous) {
            this.onEffectUpdated(effect, true, source);
        } else {
            this.onEffectAdded(effect, source);
        }
    }

    public forceRemoveEffect(effect: RegistryEntry<StatusEffect>): StatusEffectInstance | null {
        const instance = this.activeEffects.get(effect);
        if (instance) {
            this.activeEffects.delete(effect);
        }
        return instance ?? null;
    }

    public removeEffect(effect: RegistryEntry<StatusEffect>): boolean {
        const instance = this.forceRemoveEffect(effect);
        if (instance) {
            this.onEffectRemoved(instance);
            return true;
        }
        return false;
    }

    public clearEffects(): boolean {
        if (isClient) return false;
        if (this.activeEffects.size === 0) return false;

        for (const effect of this.activeEffects.values()) {
            this.onEffectRemoved(effect);
        }

        this.activeEffects.clear();
        this.onAttributeUpdated();
        return true;
    }

    protected onEffectAdded(effect: StatusEffectInstance, _source: Entity | null): void {
        if (isClient) return;
        this.effectsDirty = true;
        effect.type().getValue().addAttributeModifiers(this.attributes, effect.amplifier());
    }

    protected onEffectUpdated(effect: StatusEffectInstance, reapplyEffect: boolean, _source: Entity | null): void {
        if (isClient) return;

        this.effectsDirty = true;
        if (reapplyEffect) {
            const statusEffect = effect.type().getValue();
            statusEffect.removeAttributeModifiers(this.attributes);
            statusEffect.addAttributeModifiers(this.attributes, effect.amplifier());
            this.onAttributeUpdated();
        }
    }

    protected onEffectRemoved(effect: StatusEffectInstance): void {
        if (isClient) return;

        this.effectsDirty = true;
        effect.type().getValue().removeAttributeModifiers(this.attributes);
        this.onAttributeUpdated();
    }

    // 数据同步

    public updateSyncData() {
        super.updateSyncData();

        if (!this.effectsDirty) return;
        this.effectsDirty = false;

        if (this.activeEffects.size === 0) {
            this.dataTracker.set(LivingEntity.DATA_EFFECT, []);
            return;
        }

        const effects = this.activeEffects.keys()
            .filter(v => v.getValue().isVisible)
            .toArray();
        this.dataTracker.set(LivingEntity.DATA_EFFECT, effects);
    }

    public override onTrackedDataSet(_data: TrackedData<any>) {
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        const x = packet.x;
        const y = packet.y;
        const yaw = packet.yaw;
        this.setDeltaMovement(x, y);
        this.setId(packet.entityId);
        this.setUuid(packet.uuid);
        this.updatePosition(x, y);
        this.updateYaw(yaw);
        this.setVelocity(packet.velocityX, packet.velocityY);

        this.color.hex = packet.color;
        this.color.edgeHex = packet.edgeColor;
    }

    // 插值

    public getInterpolation(): InterpolationHandler | null {
        return this.interpolation;
    }

    // 持久化

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);

        const health = this.getHealth();
        nbt.setFloat('health', Number.isFinite(health) ? health : 5);

        const shield = this.getShieldAmount();
        nbt.setFloat('shield', Number.isFinite(shield) ? shield : 0);
        nbt.setCompoundArray('attributes', this.getAttributes().toNbt());

        if (this.activeEffects.size > 0) {
            const nbtList: NbtCompound[] = [];
            for (const effect of this.activeEffects.values()) {
                nbtList.push(effect.toNbt());
            }

            nbt.setCompoundArray('active_effects', nbtList);
        }

        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);

        this.setShieldAmountUnclamped(nbt.getFloat('shield'));

        const attributes = nbt.getCompoundArray('attributes');
        if (attributes.length > 0 && !this.getWorld().isClient) {
            this.getAttributes().readNbt(attributes);
        }

        const effects = nbt.getCompoundArray('active_effects');
        if (effects.length > 0) {
            for (const effectNbt of effects) {
                const effect = StatusEffectInstance.fromNbt(effectNbt);
                if (effect) this.addStatusEffect(effect, null);
            }
            this.effectsDirty = true;
        }

        if (nbt.contains('health', NbtTypeId.Number)) {
            this.setHealth(nbt.getFloat('health'));
        }
    }
}