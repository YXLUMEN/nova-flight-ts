import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {StatusEffect} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import {clamp} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {NbtCompound} from "../../nbt/NbtCompound.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";

export class StatusEffectInstance {
    public static readonly INFINITE = -1;
    public static readonly MIN_AMPLIFIER = 0;
    public static readonly MAX_AMPLIFIER = 255;

    private readonly type: RegistryEntry<StatusEffect>;
    private duration: number;
    private amplifier: number;

    public constructor(type: RegistryEntry<StatusEffect>, duration: number, amplifier: number = 0) {
        this.type = type;
        this.duration = duration;
        this.amplifier = clamp(Math.floor(amplifier), 0, 255);
    }

    public static fromNbt(nbt: NbtCompound): StatusEffectInstance | null {
        const id = Identifier.tryParse(nbt.getString('type'));
        if (!id) return null;

        const type = Registries.STATUS_EFFECT.getEntryById(id);
        if (!type) return null;
        const duration = nbt.getDouble('duration');
        if (!Number.isFinite(duration)) throw new Error("StatusEffect duration should be finite");

        const amplifier = nbt.getUint('amplifier');
        if (!Number.isSafeInteger(amplifier)) throw new Error("StatusEffect amplifier should be valid integer");

        return new StatusEffectInstance(type, duration, amplifier);
    }

    public upgrade(that: StatusEffectInstance): boolean {
        if (this.type !== that.type) {
            console.warn("This method should only be called for matching effects!");
        }

        if (that.amplifier > this.amplifier) {
            this.amplifier = that.amplifier;
            this.duration = that.duration;
            return true;
        }
        if (this.lastsShorterThan(that)) {
            if (that.amplifier === that.amplifier) {
                this.duration = that.duration;
                return true;
            }
        }
        return false;
    }

    public isInfinite(): boolean {
        return this.duration === -1;
    }

    public getEffectType() {
        return this.type;
    }

    public getDuration(): number {
        return this.duration;
    }

    public getAmplifier() {
        return this.amplifier;
    }

    public update(entity: LivingEntity): boolean {
        if (this.isActive()) {
            const effect = this.type.getValue();
            if (effect.canApplyUpdateEffect(this.duration, this.amplifier) && !effect.applyUpdateEffect(entity, this.amplifier)) {
                entity.removeStatusEffect(this.type);
            }

            if (this.isInfinite()) return true;

            this.duration -= 1;
            if (this.duration === 0) {
                entity.removeStatusEffect(this.type);
            }
        }

        return this.isActive();
    }

    public onApplied(entity: LivingEntity) {
        this.type.getValue().onAppliedAt(entity, this.amplifier);
    }

    public onEntityRemoval(entity: LivingEntity) {
        this.type.getValue().onEntityRemoval(entity, this.amplifier);
    }

    public onEntityDamage(entity: LivingEntity, source: DamageSource, amount: number) {
        this.type.getValue().onEntityDamage(entity, this.amplifier, source, amount);
    }

    public toString(): string {
        if (this.amplifier > 0) {
            return `${this.type.toString()} x ${this.amplifier + 1}, duration: ${this.getDurationString()}`;
        } else {
            return `${this.type.toString()}, duration: ${this.getDurationString()}`;
        }
    }

    public getDurationString(): string {
        return this.isInfinite() ? 'infinite' : this.duration.toFixed(2);
    }

    public equals(o: Object): boolean {
        if (o === this) return true;
        if (o instanceof StatusEffectInstance) {
            return this.duration === o.duration &&
                this.amplifier === o.amplifier &&
                this.type === o.type;
        }
        return false;
    }

    public toNbt(): NbtCompound {
        const nbt = new NbtCompound();
        nbt.putString('type', this.type.getRegistryKey().getValue().toString());
        nbt.putDouble('duration', this.duration);
        nbt.putUint('amplifier', this.amplifier);

        return nbt
    }

    private lastsShorterThan(effect: StatusEffectInstance): boolean {
        return !this.isInfinite() && (this.duration < effect.duration || effect.isInfinite());
    }

    private isActive(): boolean {
        return this.isInfinite() || this.duration > 0;
    }
}