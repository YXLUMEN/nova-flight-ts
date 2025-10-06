import type {World} from "../../world/World.ts";
import {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {HALF_PI} from "../../utils/math/math.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class MissileWeapon extends SpecialWeapon {
    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (world.isClient) return;

        const pos = attacker.getPositionRef;
        const missileCounts = stack.getOrDefault(DataComponentTypes.MISSILE_COUNT, 8);
        const explosionDamage = stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 10);
        const explosionRadius = stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 72);
        let i = 1;

        const schedule = world.scheduleInterval(0.1, () => {
            if (i++ > missileCounts) {
                schedule.cancel();
                world.stopLoopSound(SoundEvents.MISSILE_LAUNCH_LOOP);
                return;
            }

            const side = (i % 2 === 0) ? 1 : -1;
            const yaw = attacker.getYaw();

            const driftAngle = yaw + side * (HALF_PI + (Math.random() - 0.5) * 0.2);

            const missile = new MissileEntity(EntityTypes.MISSILE_ENTITY, world, attacker, driftAngle);
            missile.explosionDamage = explosionDamage;
            missile.explosionRadius = explosionRadius;
            missile.setHoverDir(side);
            missile.setYaw(yaw);
            missile.setPosition(pos.x, pos.y);
            (world as ServerWorld).spawnEntity(missile);
        });

        world.schedule(1.6, () => world.playSound(SoundEvents.MISSILE_BLASTOFF));

        if (missileCounts > 8) {
            world.playLoopSound(SoundEvents.MISSILE_LAUNCH_LOOP);
        } else {
            world.playSound(SoundEvents.MISSILE_LAUNCH_COMP);
        }
        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    public bindKey(): string {
        return 'Digit1';
    }

    public override getDisplayName(): string {
        return '导弹';
    }

    public override getUiColor(): string {
        return '#ff9f43';
    }
}