import {Entity} from "./Entity.ts";
import type {World} from "../world/World.ts";
import {clamp, PI2} from "../utils/math/math.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {StatusEffectInstance} from "./effect/StatusEffectInstance.ts";
import type {StatusEffect} from "./effect/StatusEffect.ts";
import type {EntityType} from "./EntityType.ts";
import {DataTracker} from "./data/DataTracker.ts";
import {AttributeContainer} from "./attribute/AttributeContainer.ts";
import type {EntityAttribute} from "./attribute/EntityAttribute.ts";
import {EntityAttributes} from "./attribute/EntityAttributes.ts";
import type {AttributeInstance} from "./attribute/AttributeInstance.ts";
import {AttributeSupplier} from "./attribute/AttributeSupplier.ts";
import {type NbtCompound} from "../nbt/element/NbtCompound.ts";
import {TrackedDataHandlerRegistry} from "./data/TrackedDataHandlerRegistry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntitySpawnS2CPacket} from "../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {EntityDamageS2CPacket} from "../network/packet/s2c/EntityDamageS2CPacket.ts";
import {DamageTypeTags} from "../registry/tag/DamageTypeTags.ts";
import {StatusEffects} from "./effect/StatusEffects.ts";
import {NbtTypeId} from "../nbt/NbtType.ts";


export abstract class LivingEntity extends Entity {
    private static readonly HEALTH = DataTracker.registerData(Object(LivingEntity), TrackedDataHandlerRegistry.FLOAT);

    private shieldAmount: number = 0;
    protected positionIncrements: number;
    protected serverX: number = 0;
    protected serverY: number = 0;
    protected serverYaw: number = 0;

    private readonly attributes: AttributeContainer;
    private readonly activeEffects = new Map<RegistryEntry<StatusEffect>, StatusEffectInstance>();

    protected constructor(type: EntityType<LivingEntity>, world: World) {
        super(type, world);

        this.attributes = new AttributeContainer(this.createLivingAttributes().build(type));
        this.setHealth(this.getMaxHealth());

        this.positionIncrements = 0;
    }

    public createLivingAttributes(): InstanceType<typeof AttributeSupplier.Builder> {
        return AttributeSupplier.builder()
            .add(EntityAttributes.GENERIC_MAX_HEALTH)
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED)
            .add(EntityAttributes.GENERIC_MAX_SHIELD);
    }

    protected override defineSyncedData(builder: InstanceType<typeof DataTracker.Builder>) {
        builder.define(LivingEntity.HEALTH, 1);
    }

    public override tick() {
        super.tick();

        if (!this.isRemoved()) {
            this.aiStep();
        }

        this.tickStatusEffects();
    }

    protected aiStep() {
        if (this.isLogicalSide()) {
            this.positionIncrements = 0;
            this.setDeltaMovement(this.getX(), this.getY());
        }

        if (this.positionIncrements > 0) {
            this.lerpPosAndYaw(this.positionIncrements, this.serverX, this.serverY, this.serverYaw);
            this.positionIncrements--;
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
        const entities = this.getWorld()
            .searchOtherEntities(this, this.getBoundingBox(), entity => entity.isPushAble());
        for (const entity of entities) {
            this.pushAwayFrom(entity);
        }
    }

    protected override onDiscard(): void {
        this.onRemoval();
        super.onDiscard();
    }

    protected onRemoval(): void {
        for (const instance of this.getStatusEffects()) {
            instance.onEntityRemoved(this);
        }

        this.activeEffects.clear();
    }

    public getAttributes(): AttributeContainer {
        return this.attributes;
    }

    public getAttributeInstance(attribute: RegistryEntry<EntityAttribute>): AttributeInstance | null {
        return this.attributes.getCustomInstance(attribute);
    }

    public getAttributeValue(attribute: RegistryEntry<EntityAttribute>): number {
        return this.attributes.getValue(attribute);
    }

    public getAttributeBaseValue(attribute: RegistryEntry<EntityAttribute>): number {
        return this.attributes.getBaseValue(attribute);
    }

    public getMaxHealth(): number {
        return this.getAttributeValue(EntityAttributes.GENERIC_MAX_HEALTH);
    }

    public getHealth(): number {
        return this.dataTracker.get(LivingEntity.HEALTH);
    }

    public setHealth(health: number): void {
        this.dataTracker.set(LivingEntity.HEALTH, clamp(health, 0, this.getMaxHealth()));
    }

    public getMaxShield(): number {
        return this.getAttributeValue(EntityAttributes.GENERIC_MAX_SHIELD);
    }

    public getShieldAmount(): number {
        return this.shieldAmount;
    }

    // 不应该重写此方法
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

        if (this.hasStatusEffect(StatusEffects.RESISTANCE) && !source.isIn(DamageTypeTags.BYPASSES_RESISTANCE)) {
            const reduce = this.getStatusEffect(StatusEffects.RESISTANCE)!.getAmplifier();
            const percent = (8 - reduce) * 0.1;
            damage = Math.max(0, damage * percent);
        }

        return damage > 1E-5 ? damage : 0;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;
        if (this.getWorld().isClient) return false;
        if (this.isDead()) return false;

        damage = this.modifyAppliedDamage(damageSource, damage);
        let remain = damage;

        const channel = this.getWorld().getNetworkChannel();
        const shieldAmount = this.getShieldAmount();

        if (shieldAmount > 0 && !damageSource.isIn(DamageTypeTags.BYPASSES_SHIELD)) {
            const hitShield = damage * damageSource.getShieldMulti();

            remain = Math.max(hitShield - shieldAmount, 0);
            this.setShieldAmount(shieldAmount - hitShield + remain);

            if (hitShield > 0) {
                channel.send(EntityDamageS2CPacket.create(this.getId(), this.positionRef, hitShield, '#73c4ff'));
            }
        }

        if (remain > 0) {
            remain *= damageSource.getHealthMulti();

            this.setHealth(this.getHealth() - remain);

            for (const effect of this.getStatusEffects()) {
                effect.onEntityDamage(this, damageSource, remain);
            }
            if (this.isDead()) this.onDeath(damageSource);

            channel.send(EntityDamageS2CPacket.create(this.getId(), this.positionRef, remain));
        }

        if (damage === 0) {
            channel.send(EntityDamageS2CPacket.create(this.getId(), this.positionRef, 0, '#979797'));
        }

        return true;
    }

    protected tickStatusEffects(): void {
        if (this.activeEffects.size === 0) return;

        if (this.isClient()) {
            for (const effect of this.activeEffects.values()) {
                effect.tickClient(this);
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

    public addEffect(effect: StatusEffectInstance, source: Entity | null): boolean {
        if (!this.canHaveEffect(effect)) return false;

        const type = effect.getEffect();
        const instance = this.activeEffects.get(type);

        if (!instance) {
            this.activeEffects.set(type, effect);
            this.onEffectAdded(effect, source);
            effect.onApplied(this);
            effect.onEffectStarted(this);
            return true;
        }

        const upgraded = instance.upgrade(effect);
        if (upgraded) {
            this.onEffectUpdated(instance, true, source);
        }
        effect.onEffectStarted(this);
        return upgraded;
    }

    public canHaveEffect(_effect: StatusEffectInstance): boolean {
        return true;
    }

    public setStatusEffect(effect: StatusEffectInstance, source: Entity | null): void {
        if (!this.canHaveEffect(effect)) return;

        const previous = this.activeEffects.get(effect.getEffect());
        if (!previous) {
            this.onEffectAdded(effect, source);
        } else {
            this.onEffectUpdated(effect, true, source);
        }
    }

    public removeEffectNoUpdate(effect: RegistryEntry<StatusEffect>): StatusEffectInstance | null {
        const instance = this.activeEffects.get(effect);
        if (instance) {
            this.activeEffects.delete(effect);
        }
        return instance ?? null;
    }

    public removeEffect(effect: RegistryEntry<StatusEffect>): boolean {
        const instance = this.removeEffectNoUpdate(effect);
        if (instance) {
            this.onEffectRemoved(instance);
            return true;
        }
        return false;
    }

    public clearEffects(): boolean {
        if (this.isClient()) return false;
        if (this.activeEffects.size === 0) return false;

        for (const effect of this.activeEffects.values()) {
            effect.getEffect().getValue().removeAttributeModifiers(this.attributes);
        }
        this.activeEffects.clear();
        this.onAttributeUpdated();
        return true;
    }

    protected onEffectAdded(effect: StatusEffectInstance, _source: Entity | null): void {
        if (this.isClient()) return;
        effect.getEffect().getValue().addAttributeModifiers(this.attributes, effect.getAmplifier());
    }

    protected onEffectUpdated(effect: StatusEffectInstance, reapplyEffect: boolean, _source: Entity | null): void {
        if (reapplyEffect && !this.isClient()) {
            const statusEffect = effect.getEffect().getValue();
            statusEffect.removeAttributeModifiers(this.attributes);
            statusEffect.addAttributeModifiers(this.attributes, effect.getAmplifier());
            this.onAttributeUpdated();
        }
    }

    protected onEffectRemoved(effect: StatusEffectInstance): void {
        if (this.isClient()) return;

        effect.getEffect().getValue().removeAttributeModifiers(this.attributes);
        this.onAttributeUpdated();
    }

    private onAttributeUpdated(): void {
        const pendingAttr = this.attributes.getPendingUpdate();
        for (const attr of pendingAttr) {
            this.updateAttribute(attr.getAttribute());
        }

        pendingAttr.clear();
    }

    private updateAttribute(attribute: RegistryEntry<EntityAttribute>): void {
        if (attribute.matches(EntityAttributes.GENERIC_MAX_HEALTH)) {
            const maxHealth = this.getMaxHealth();
            if (this.getHealth() > maxHealth) {
                this.setHealth(maxHealth);
            }
        } else if (attribute.matches(EntityAttributes.GENERIC_MAX_SHIELD)) {
            const maxShield = this.getMaxShield();
            if (this.getShieldAmount() > maxShield) {
                this.setShieldAmount(maxShield);
            }
        }
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
        this.serverX = packet.x;
        this.serverY = packet.y;
        this.color = packet.color;
        this.edgeColor = packet.edgeColor;
    }

    public override isPushAble(): boolean {
        return this.isAlive();
    }

    public override updatePositionAndAngles(x: number, y: number, yaw: number, interpolationSteps: number) {
        this.serverX = x;
        this.serverY = y;
        this.serverYaw = yaw;
        this.positionIncrements = interpolationSteps;
    }

    public getLerpTargetX() {
        return this.positionIncrements > 0 ? this.serverX : this.getX();
    }

    public getLerpTargetY() {
        return this.positionIncrements > 0 ? this.serverY : this.getY();
    }

    public getLerpTargetYaw() {
        return this.positionIncrements > 0 ? this.serverYaw : this.getYaw();
    }

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
                if (effect) this.addEffect(effect, null);
            }
        }

        if (nbt.contains('health', NbtTypeId.Number)) {
            this.setHealth(nbt.getFloat('health'));
        }
    }
}