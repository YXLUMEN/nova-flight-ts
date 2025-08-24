import {Weapon} from "./Weapon.ts";
import {World} from "../World.ts";
import type {Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/PlayerEntity.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {EMPBurst} from "../effect/EMPBurst.ts";
import {pointInCircleVec2} from "../math/math.ts";
import type {MutVec2} from "../math/MutVec2.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {StatusEffectInstance} from "../status/StatusEffectInstance.ts";
import {StatusEffects} from "../status/StatusEffects.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";

export class EMPWeapon extends Weapon implements ISpecialWeapon {
    public radius: number = 480;

    constructor(owner: Entity) {
        super(owner, 0, 10);
    }

    public override tryFire(world: World): void {
        EMPWeapon.applyEMPEffect(world, this.owner.pos, this.radius);
        world.addEffect(new ScreenFlash(0.5, 0.18, '#5ec8ff'));
        world.addEffect(new EMPBurst(
            this.owner.getPos(),
            this.radius
        ));

        for (const b of world.bullets) {
            if (!(b.owner instanceof PlayerEntity)) b.discard();
        }

        this.setCooldown(this.getMaxCooldown());
    }

    public bindKey(): string {
        return 'Digit2';
    }

    public override getDisplayName(): string {
        return 'EMP';
    }

    public override getUiColor(): string {
        return '#5ec8ff'
    }

    public static applyEMPEffect(world: World, center: MutVec2, radius: number) {
        world.events.emit('emp-burst', {duration: 12});

        const duration = 12 * WorldConfig.tick;
        for (const mob of world.mobs) {
            if (!mob.isDead() && pointInCircleVec2(mob.pos, center, radius)) {
                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.EMCStatus, duration, 1));
            }
        }
    }
}