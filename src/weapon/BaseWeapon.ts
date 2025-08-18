import {Weapon} from "./Weapon.ts";
import {clamp} from "../math/math.ts";
import type {Entity} from "../entity/Entity.ts";

export abstract class BaseWeapon extends Weapon {
    private fireRate: number;

    protected constructor(owner: Entity, damage: number, fireRate: number) {
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