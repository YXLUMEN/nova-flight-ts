import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {StatusEffect} from "./StatusEffect.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import {clamp} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
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

        const amplifier = nbt.getUint32('amplifier');
        if (!Number.isSafeInteger(amplifier)) throw new Error("StatusEffect amplifier should be valid integer");

        return new StatusEffectInstance(type, duration, amplifier);
    }

    public static fromOther(other: StatusEffectInstance): StatusEffectInstance {
        return new StatusEffectInstance(other.type, other.duration, other.amplifier);
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

    public getEffect() {
        return this.type;
    }

    public getDuration(): number {
        return this.duration;
    }

    public getAmplifier() {
        return this.amplifier;
    }

    public tickServer(entity: LivingEntity): boolean {
        if (!this.hasRemaining()) return false;

        const effect = this.type.getValue();
        if (effect.shouldApplyThisTick(this.duration, this.amplifier) &&
            !effect.applyEffectTick(entity, this.amplifier)) {
            return false;
        }

        if (!this.isInfinite() && this.duration > 0) {
            this.duration -= 1;
        }
        return this.hasRemaining();
    }

    public tickClient() {
        if (!this.hasRemaining()) return;
        if (!this.isInfinite() && this.duration > 0) {
            this.duration -= 1;
        }
    }

    public onApplied(entity: LivingEntity) {
        this.type.getValue().onAppliedAt(entity, this.amplifier);
    }

    public onEffectStarted(entity: LivingEntity) {
        this.type.getValue().onEffectStarted(entity, this.amplifier);
    }

    public onEntityRemoved(entity: LivingEntity) {
        this.type.getValue().onEntityRemoved(entity, this.amplifier);
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
        nbt.setString('type', this.type.getRegistryKey().getValue().toString());
        nbt.setDouble('duration', this.duration);
        nbt.setUint32('amplifier', this.amplifier);

        return nbt
    }

    private lastsShorterThan(effect: StatusEffectInstance): boolean {
        return !this.isInfinite() && (this.duration < effect.duration || effect.isInfinite());
    }

    private hasRemaining(): boolean {
        return this.isInfinite() || this.duration > 0;
    }
}