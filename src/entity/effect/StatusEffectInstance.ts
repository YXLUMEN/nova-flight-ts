import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {StatusEffect} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import {clamp} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {Entity} from "../Entity.ts";

export class StatusEffectInstance {
    public static readonly INFINITE = -1;
    public static readonly MIN_AMPLIFIER = 0;
    public static readonly MAX_AMPLIFIER = 255;

    private readonly effectType: RegistryEntry<StatusEffect>;
    private duration: number;
    private amplification: number;

    public source: Entity | null = null;

    public constructor(type: RegistryEntry<StatusEffect>, duration: number, amplifier: number = 0) {
        this.effectType = type;
        this.duration = duration;
        this.amplification = clamp(Math.floor(amplifier), 0, 255);
    }

    public static fromNbt(nbt: NbtCompound): StatusEffectInstance | null {
        const id = Identifier.tryParse(nbt.getString('type'));
        if (!id) return null;

        const type = Registries.STATUS_EFFECT.getEntryById(id);
        if (!type) return null;
        const duration = nbt.getDouble('duration');
        if (!Number.isFinite(duration)) throw new Error("StatusEffect duration should be finite");

        const amplifier = nbt.getUint32('amplifier');
        if (!Number.isSafeInteger(amplifier)) throw new Error("StatusEffect amplifier should be valid integer");

        return new StatusEffectInstance(type, duration, amplifier);
    }

    public static fromOther(other: StatusEffectInstance): StatusEffectInstance {
        return new StatusEffectInstance(other.effectType, other.duration, other.amplification);
    }

    public upgrade(that: StatusEffectInstance): boolean {
        if (this.effectType !== that.effectType) {
            console.warn("This method should only be called for matching effects!");
        }

        if (that.amplification > this.amplification) {
            this.amplification = that.amplification;
            this.duration = that.duration;
            return true;
        }
        if (this.lastsShorterThan(that)) {
            if (that.amplification === that.amplification) {
                this.duration = that.duration;
                return true;
            }
        }
        return false;
    }

    public isInfinite(): boolean {
        return this.duration === -1;
    }

    public type() {
        return this.effectType;
    }

    public getDuration(): number {
        return this.duration;
    }

    public amplifier(): number {
        return this.amplification;
    }

    public tickServer(entity: LivingEntity): boolean {
        if (!this.hasRemaining()) return false;

        const effect = this.effectType.getValue();
        const tickCount = this.isInfinite() ? entity.age : this.duration;
        if (effect.shouldApplyThisTick(tickCount, this.amplification) &&
            !effect.applyEffectTick(this.source, entity, this.amplification)) {
            return false;
        }

        if (this.duration > 0) {
            this.duration--;
        }
        return this.hasRemaining();
    }

    public tickClient(): void {
        if (!this.hasRemaining()) return;
        if (this.duration > 0) {
            this.duration--;
        }
    }

    public onApplied(entity: LivingEntity) {
        this.effectType.getValue().onAppliedAt(entity, this.amplification);
    }

    public onEffectStarted(entity: LivingEntity) {
        this.effectType.getValue().onEffectStarted(entity, this.amplification);
    }

    public onEntityRemoved(entity: LivingEntity) {
        this.effectType.getValue().onEntityRemoved(entity, this.amplification);
    }

    public onEntityDamage(entity: LivingEntity, source: DamageSource, amount: number) {
        this.effectType.getValue().onEntityDamage(entity, this.amplification, source, amount);
    }

    public toString(): string {
        if (this.amplification > 0) {
            return `${this.effectType.toString()} x ${this.amplification + 1}, duration: ${this.getDurationString()}`;
        } else {
            return `${this.effectType.toString()}, duration: ${this.getDurationString()}`;
        }
    }

    public getDurationString(): string {
        return this.isInfinite() ? 'infinite' : this.duration.toFixed(2);
    }

    public equals(o: Object): boolean {
        if (o === this) return true;
        if (o instanceof StatusEffectInstance) {
            return this.duration === o.duration &&
                this.amplification === o.amplification &&
                this.effectType === o.effectType;
        }
        return false;
    }

    public toNbt(): NbtCompound {
        const nbt = new NbtCompound();
        nbt.setString('type', this.effectType.getRegistryKey().getValue().toString());
        nbt.setDouble('duration', this.duration);
        nbt.setUint32('amplifier', this.amplification);

        return nbt
    }

    private lastsShorterThan(effect: StatusEffectInstance): boolean {
        return !this.isInfinite() && (this.duration < effect.duration || effect.isInfinite());
    }

    private hasRemaining(): boolean {
        return this.isInfinite() || this.duration > 0;
    }
}