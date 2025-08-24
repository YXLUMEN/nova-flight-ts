import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {StatusEffect} from "./StatusEffect.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {clamp} from "../math/math.ts";

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

    public update(entity: LivingEntity): boolean {
        const effect = this.type.getValue();
        if (effect.canApplyUpdateEffect(this.duration, this.amplifier) && !effect.applyUpdateEffect(entity, this.amplifier)) {
            entity.removeStatusEffect(this.type);
        }

        if (this.isInfinite()) return true;

        this.duration -= 1;
        if (this.duration <= 0) {
            entity.removeStatusEffect(this.type);
        }

        return this.isActive();
    }

    public upgrade(effect: StatusEffectInstance): boolean {
        if (!Object.is(this.type, effect.type)) {
            console.warn("This method should only be called for matching effects!");
        }
        if (effect.amplifier > this.amplifier) {
            this.amplifier = effect.amplifier;
            this.duration = effect.duration;
            return true;
        }
        if (this.lastsShorterThan(effect)) {
            this.duration = effect.duration;
            return true;
        }
        return false;
    }

    private lastsShorterThan(effect: StatusEffectInstance): boolean {
        return !this.isInfinite() && (this.duration < effect.duration || effect.isInfinite());
    }

    private isActive(): boolean {
        return this.isInfinite() || this.duration > 0;
    }

    public isInfinite(): boolean {
        return this.duration === -1;
    }

    public getEffectType() {
        return this.type;
    }

    public getAmplifier() {
        return this.amplifier;
    }
}