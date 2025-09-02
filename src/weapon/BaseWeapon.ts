import {Weapon} from "./Weapon.ts";
import {clamp} from "../utils/math/math.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";

export abstract class BaseWeapon extends Weapon {
    private fireRate: number;

    protected constructor(owner: LivingEntity, damage: number, fireRate: number) {
        super(owner, damage, fireRate);
        this.fireRate = fireRate;
    }

    public getFireRate(): number {
        return this.fireRate;
    }

    public setFireRate(fireRate: number) {
        this.fireRate = clamp(fireRate, 0, 256);
        this.setMaxCooldown(this.fireRate);
    }
}