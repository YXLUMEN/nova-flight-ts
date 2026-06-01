import type {SpawnContext} from "./SpawnContext.ts";
import type {Return} from "../../type/types.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import type {EntityType} from "../../entity/EntityType.ts";
import {clamp} from "../../utils/math/math.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {TankEnemy} from "../../entity/mob/TankEnemy.ts";
import {AiBehavior, MobAI} from "../../entity/ai/MobAI.ts";

export class MobBlueprint {
    public readonly type: EntityType<MobEntity>;
    /** 击杀得分 */
    public readonly worth: number;
    /** 移动速度倍率 */
    public readonly speed: number;
    /** 额外生命值(在基础最大生命之上叠加) */
    public readonly bonusHp: number;
    /** 着色，默认 '#ff6b6b' */
    public readonly color: string;
    /**
     * HP 缩放策略:
     * - true:             bonusHp 会乘以 difficulty
     * - false:            bonusHp 原样应用，不缩放
     * - (ctx) => number: bonusHp * fn(ctx) * difficulty
     */
    public readonly hpScale: boolean | Return<SpawnContext, number>;
    /** 是否启用难度精英效果(护盾/抗性) */
    public readonly elite: boolean;
    /** 生成后是否设为漫游 AI */
    public readonly wander: boolean;

    public constructor(
        type: EntityType<MobEntity>,
        worth: number,
        speed: number,
        bonusHp: number,
        color: string,
        hpScale: boolean | Return<SpawnContext, number>,
        elite: boolean,
        wander: boolean,
    ) {
        this.type = type;
        this.worth = worth;
        this.speed = speed;
        this.bonusHp = bonusHp;
        this.elite = elite;
        this.color = color;
        this.wander = wander;
        this.hpScale = hpScale;
    }

    public create(ctx: SpawnContext) {
        const mob = this.type.create(ctx.world, this.worth);

        mob.color = this.color;
        mob.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)
            ?.setBaseValue(this.speed);

        this.applyHealth(ctx, mob);

        if (this.wander) {
            const ai = mob.getAi();
            if (ai instanceof MobAI) {
                ai.setBehavior(AiBehavior.Wander);
            }
        }

        return mob;
    }

    private applyHealth(ctx: SpawnContext, mob: MobEntity) {
        if (this.bonusHp === 0) return;

        let extra: number;
        if (typeof this.hpScale === 'function') {
            extra = this.bonusHp * this.hpScale(ctx) * ctx.difficulty;
        } else if (this.hpScale) {
            extra = this.bonusHp * ctx.difficulty;
        } else {
            extra = this.bonusHp;
        }

        const maxHealth = mob.getMaxHealth();
        mob.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)
            ?.setBaseValue(maxHealth + Math.floor(extra));
        mob.setHealth(mob.getMaxHealth());

        if (this.elite) {
            this.applyEliteEffects(ctx, mob, extra);
        }
    }

    private applyEliteEffects(ctx: SpawnContext, mob: MobEntity, health: number): void {
        if (ctx.difficulty > 2 && ctx.rng() > 0.7) {
            const shieldAmount = Math.max(ctx.difficulty, health / 6);
            mob.addEffect(
                new StatusEffectInstance(StatusEffects.SHIELD, -1, shieldAmount),
                null,
            );
            return;
        }

        if (ctx.difficulty > 8 && ctx.rng() > 0.9 && !(mob instanceof TankEnemy)) {
            mob.addEffect(
                new StatusEffectInstance(StatusEffects.RESISTANCE, 800, Math.min(7, ctx.difficulty)),
                null,
            );
        }
    }
}

export class MobBlueprintBuilder {
    private readonly type: EntityType<MobEntity>;
    private _worth: number = 1;
    private _speed: number = 1.0;
    private _bonusHp: number = 0;
    private _color: string = '#ff6b6b';
    private _hpScale: boolean | Return<SpawnContext, number> = true;
    private elite: boolean = false;
    private wander: boolean = false;

    public constructor(type: EntityType<MobEntity>) {
        this.type = type;
    }

    public static of(type: EntityType<MobEntity>): MobBlueprintBuilder {
        return new MobBlueprintBuilder(type);
    }

    public worth(worth: number): this {
        this._worth = Math.floor(worth);
        return this;
    }

    public speed(speed: number): this {
        this._speed = clamp(speed, 0, 256);
        return this;
    }

    public bonusHp(hp: number): this {
        this._bonusHp = hp;
        return this;
    }

    public color(color: string): this {
        this._color = color;
        return this;
    }

    public noScale(): this {
        this._hpScale = false;
        return this;
    }

    public scale(hpScale: Return<SpawnContext, number>): this {
        this._hpScale = hpScale;
        return this;
    }

    public isElite(): this {
        this.elite = true;
        return this;
    }

    public setWander(): this {
        this.wander = true;
        return this;
    }

    public build(): MobBlueprint {
        return new MobBlueprint(
            this.type,
            this._worth,
            this._speed,
            this._bonusHp,
            this._color,
            this._hpScale,
            this.elite,
            this.wander,
        );
    }
}