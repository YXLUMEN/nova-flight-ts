import {Weapon} from "./Weapon.ts";
import {World} from "../World.ts";
import {SlowStatus} from "../status/SlowStatus.ts";
import type {Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/PlayerEntity.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";

export class EMPWeapon extends Weapon implements ISpecialWeapon {
    constructor(owner: Entity) {
        super(owner, 0, 10);
    }

    public override tryFire(world: World): void {
        if (this.getCooldown() > 0) return;

        EMPWeapon.applyEMPEffect(world);
        world.events.emit('emp-detonate', {
            pos: this.owner.pos.clone(),
        });

        for (const b of world.bullets) {
            if (!(b.owner instanceof PlayerEntity)) b.onDeath(world);
        }

        this.setCooldown(this.getMaxCooldown());
    }

    public bindKey(): string {
        return 'Digit2';
    }

    public getDisplayName(): string {
        return 'EMP';
    }

    public getUiColor(): string {
        return '#5ec8ff'
    }

    public static applyEMPEffect(world: World) {
        for (const mob of world.mobs) {
            if (!mob.isDead) mob.addStatus(new SlowStatus(6, 0.35));
        }
    }
}