import type {LivingEntity} from "../LivingEntity.ts";
import type {Entity} from "../Entity.ts";
import type {Return} from "../../type/types.ts";
import {StatusEffect, StatusEffectCategory} from "./StatusEffect.ts";
import {ShieldAuraEffect} from "../../effect/ShieldAuraEffect.ts";
import {isServer} from "../../configs/RuntimeConfig.ts";


export class ShieldStatusEffect extends StatusEffect {
    private readonly tracked: WeakMap<LivingEntity, ShieldAuraEffect> = null!;
    private readonly summonVisual: Return<LivingEntity, ShieldAuraEffect> = null!;

    public constructor() {
        super(StatusEffectCategory.BENEFICIAL, '#5095ff', true);

        if (isServer) return;
        // 过渡方案,让状态效果间接控制特效渲染
        this.tracked = new WeakMap();
        this.summonVisual = (entity: LivingEntity) => {
            const radius = entity.getDimensions().halfWidth + 8;
            const effect = new ShieldAuraEffect(entity.position(), radius, 0.1, this.color);
            effect.bindEntity = entity;
            effect.dispose = () => this.tracked.delete(entity);
            entity.getWorld().addEffect(entity, effect);
            return effect;
        };
    }

    public override applyEffectTick(_source: Entity | null, entity: LivingEntity): boolean {
        return entity.getShieldAmount() > 0;
    }

    public override clientVisual(entity: LivingEntity): void {
        const arua = this.tracked.getOrInsertComputed(entity, this.summonVisual);
        if (arua.isAlive()) arua.reset();
        else this.tracked.delete(entity);
    }

    public onAppliedAt(entity: LivingEntity, amplifier: number) {
        super.onAppliedAt(entity, amplifier);
        entity.setShieldAmount(Math.max(entity.getShieldAmount(), 4 * (1 + amplifier)));
    }

    public override shouldApplyThisTick(): boolean {
        return true;
    }
}
