import {Weapon} from "./Weapon.ts";
import {World} from "../world/World.ts";
import type {Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/PlayerEntity.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {EMPBurst} from "../effect/EMPBurst.ts";
import {pointInCircleVec2} from "../utils/math/math.ts";
import type {MutVec2} from "../utils/math/MutVec2.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";

export class EMPWeapon extends Weapon implements ISpecialWeapon {
    public radius: number = 480;
    private duration = 12 * WorldConfig.tick;

    constructor(owner: Entity) {
        super(owner, 0, 10);
    }

    public override tryFire(world: World): void {
        EMPWeapon.applyEMPEffect(world, this.owner.getMutPos, this.radius, this.duration);
        world.addEffect(new ScreenFlash(0.5, 0.18, '#5ec8ff'));
        world.addEffect(new EMPBurst(
            this.owner.getPos(),
            this.radius
        ));

        const bullets = world.getProjectiles();
        for (const b of bullets) {
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

    public setDuration(duration: number): void {
        this.duration = duration;
    }

    public static applyEMPEffect(world: World, center: MutVec2, radius: number, duration: number): void {
        world.events.emit('emp-burst', {duration: duration});

        const mobs = world.getMobs();
        for (const mob of mobs) {
            if (!mob.isRemoved() && pointInCircleVec2(mob.getMutPos, center, radius)) {
                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.EMCStatus, duration, 1));
            }
        }
    }
}