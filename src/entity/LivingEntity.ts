import {Entity} from "./Entity.ts";
import type {World} from "../world/World.ts";
import {clamp} from "../utils/math/math.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {StatusEffectInstance} from "./effect/StatusEffectInstance.ts";
import type {StatusEffect} from "./effect/StatusEffect.ts";
import type {EntityType} from "./EntityType.ts";
import {DataTracker} from "./data/DataTracker.ts";
import {AttributeContainer} from "./attribute/AttributeContainer.ts";
import type {EntityAttribute} from "./attribute/EntityAttribute.ts";
import {EntityAttributes} from "./attribute/EntityAttributes.ts";
import type {EntityAttributeInstance} from "./attribute/EntityAttributeInstance.ts";
import {DefaultAttributeContainer} from "./attribute/DefaultAttributeContainer.ts";
import {type NbtCompound} from "../nbt/NbtCompound.ts";
import {TrackedDataHandlerRegistry} from "./data/TrackedDataHandlerRegistry.ts";
import type {TrackedData} from "./data/TrackedData.ts";
import type {EntitySpawnS2CPacket} from "../network/packet/s2c/EntitySpawnS2CPacket.ts";


export abstract class LivingEntity extends Entity {
    private static readonly HEALTH = DataTracker.registerData(Object(LivingEntity), TrackedDataHandlerRegistry.FLOAT);

    protected bodyTrackingIncrements: number;
    protected serverX: number = 0;
    protected serverY: number = 0;
    protected serverYaw: number = 0;
    private readonly attributes: AttributeContainer;
    private readonly activeStatusEffects = new Map<RegistryEntry<StatusEffect>, StatusEffectInstance>();

    protected constructor(type: EntityType<LivingEntity>, world: World) {
        super(type, world);

        this.attributes = new AttributeContainer(this.createLivingAttributes().build(type));
        this.setHealth(this.getMaxHealth());

        this.bodyTrackingIncrements = 0;
    }

    public createLivingAttributes(): InstanceType<typeof DefaultAttributeContainer.Builder> {
        return DefaultAttributeContainer.builder()
            .add(EntityAttributes.GENERIC_MAX_HEALTH)
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED);
    }

    protected override initDataTracker(builder: InstanceType<typeof DataTracker.Builder>) {
        builder.add(LivingEntity.HEALTH, 1);
    }

    public override tick() {
        super.tick();
        this.tickStatusEffects();

        if (!this.isRemoved()) {
            this.tickMovement();
        }
    }

    protected tickMovement() {
        if (this.isLogicalSideForUpdatingMovement()) {
            this.bodyTrackingIncrements = 0;
            this.setTrackedPosition(this.getX(), this.getY());
        }

        if (this.bodyTrackingIncrements > 0) {
            this.lerpPosAndRotation(this.bodyTrackingIncrements, this.serverX, this.serverY, this.serverYaw);
            this.bodyTrackingIncrements--;
        }
        const velocity = this.getVelocityRef.multiply(0.9);

        let vx = velocity.x;
        let vy = velocity.y;
        if (Math.abs(vx) < 0.003) vx = 0;
        if (Math.abs(vy) < 0.003) vy = 0;
        velocity.set(vx, vy);
    }

    protected override onRemove(): void {
        this.onRemoval();
        super.onRemove();
    }

    protected onRemoval(): void {
        for (const instance of this.getStatusEffects()) {
            instance.onEntityRemoval(this);
        }

        this.activeStatusEffects.clear();
    }

    public getAttributes() {
        return this.attributes;
    }

    public getAttributeInstance(attribute: RegistryEntry<EntityAttribute>): EntityAttributeInstance | null {
        return this.attributes.getCustomInstance(attribute);
    }

    public getAttributeValue(attribute: RegistryEntry<EntityAttribute>) {
        return this.attributes.getValue(attribute);
    }

    public getAttributeBaseValue(attribute: RegistryEntry<EntityAttribute>) {
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

    public override isAlive() {
        return !this.isRemoved() && this.getHealth() > 0.0;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;

        this.setHealth(this.getHealth() - damage);
        if (damage > 0) {
            for (const effect of this.getStatusEffects()) {
                effect.onEntityDamage(this, damageSource, damage);
            }
        }

        if (this.getHealth() <= 0) this.onDeath(damageSource);
        return true;
    }

    public getStatusEffects(): MapIterator<StatusEffectInstance> {
        return this.activeStatusEffects.values();
    }

    public getActiveStatusEffects(): Map<RegistryEntry<StatusEffect>, StatusEffectInstance> {
        return this.activeStatusEffects;
    }

    public hasStatusEffect(effect: RegistryEntry<StatusEffect>): boolean {
        return this.activeStatusEffects.has(effect);
    }

    public getStatusEffect(effect: RegistryEntry<StatusEffect>): StatusEffectInstance {
        return this.activeStatusEffects.get(effect)!;
    }

    public addStatusEffect(effect: StatusEffectInstance, source: Entity | null): boolean {
        if (!this.canHaveStatusEffect(effect)) return false;

        const type = effect.getEffectType();
        const instance = this.activeStatusEffects.get(type);
        let result = false;

        if (instance === undefined) {
            this.activeStatusEffects.set(type, effect);
            this.onStatusEffectApplied(effect, source);
            result = true;
        } else if (instance.upgrade(effect)) {
            this.onStatusEffectUpgraded(instance, true, source);
            result = true;
        }

        effect.onApplied(this);
        return result;
    }

    public canHaveStatusEffect(_effect: StatusEffectInstance): boolean {
        return true;
    }

    public setStatusEffect(effect: StatusEffectInstance, source: Entity | null): void {
        if (!this.canHaveStatusEffect(effect)) return;
        const instance = this.activeStatusEffects.get(effect.getEffectType());
        if (!instance) {
            this.onStatusEffectApplied(effect, source);
        } else {
            this.onStatusEffectUpgraded(effect, true, source);
        }
    }

    public removeStatusEffectInternal(effect: RegistryEntry<StatusEffect>): boolean {
        return this.activeStatusEffects.delete(effect);
    }

    public removeStatusEffect(effect: RegistryEntry<StatusEffect>): boolean {
        if (this.removeStatusEffectInternal(effect)) {
            effect.getValue().onRemoved(this.attributes);
            this.updateAttributes();
            return true;
        }
        return false;
    }

    protected onStatusEffectApplied(effect: StatusEffectInstance, _source: Entity | null): void {
        if (this.getWorld().isClient) return;
        effect.getEffectType().getValue().onApplied(this.attributes, effect.getAmplifier());
    }

    protected tickStatusEffects(): void {
        if (this.activeStatusEffects.size === 0) return;

        for (const effect of this.activeStatusEffects.keys()) {
            const instance = this.activeStatusEffects.get(effect)!;
            if (!instance.update(this)) {
                if (!this.getWorld().isClient) {
                    this.onStatusEffectRemoved(instance);
                }
            }
        }
    }

    protected onStatusEffectUpgraded(effect: StatusEffectInstance, reapplyEffect: boolean, _source: Entity | null): void {
        if (reapplyEffect && !this.getWorld().isClient) {
            const statusEffect = effect.getEffectType().getValue();
            statusEffect.onRemoved(this.attributes);
            statusEffect.onApplied(this.attributes, effect.getAmplifier());
            this.updateAttributes();
        }
    }

    protected onStatusEffectRemoved(effect: StatusEffectInstance): void {
        effect.getEffectType().getValue().onRemoved(this.attributes);
        this.updateAttributes();
    }

    private updateAttributes(): void {
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
        }
    }

    public override onTrackedDataSet(_data: TrackedData<any>) {
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        const x = packet.x;
        const y = packet.y;
        const yaw = packet.yaw;
        this.setTrackedPosition(x, y);
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

    public override updateTrackedPositionAndAngles(x: number, y: number, yaw: number, interpolationSteps: number) {
        this.serverX = x;
        this.serverY = y;
        this.serverYaw = yaw;
        this.bodyTrackingIncrements = interpolationSteps;
    }

    public getLerpTargetX() {
        return this.bodyTrackingIncrements > 0 ? this.serverX : this.getX();
    }

    public getLerpTargetY() {
        return this.bodyTrackingIncrements > 0 ? this.serverY : this.getY();
    }

    public getLerpTargetYaw() {
        return this.bodyTrackingIncrements > 0 ? this.serverYaw : this.getYaw();
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);

        let health = this.getHealth();
        if (Number.isNaN(health)) health = 5;
        nbt.putFloat('Health', health);
        nbt.putCompoundList("attributes", this.getAttributes().toNbt());

        if (this.activeStatusEffects.size > 0) {
            const nbtList: NbtCompound[] = [];
            for (const effect of this.activeStatusEffects.values()) {
                nbtList.push(effect.toNbt());
            }

            nbt.putCompoundList('active_effects', nbtList);
        }

        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);

        const attributes = nbt.getCompoundList('attributes');
        if (attributes && attributes.length > 0) {
            this.getAttributes().readNbt(attributes);
        }

        const effects = nbt.getCompoundList('active_effects');
        if (effects && effects.length > 0) {
            for (const effectNbt of effects) {
                const effect = StatusEffectInstance.fromNbt(effectNbt);
                if (!effect) continue;
                this.activeStatusEffects.set(effect.getEffectType(), effect);
            }
        }

        this.setHealth(nbt.getFloat('Health'));
    }
}