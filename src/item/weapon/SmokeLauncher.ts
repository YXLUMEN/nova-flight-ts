import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {ItemStack} from "../ItemStack.ts";
import type {World} from "../../world/World.ts";
import type {Entity} from "../../entity/Entity.ts";
import {FireWave} from "../../entity/ai/FireWave.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {SmokeBomb} from "../../entity/projectile/SmokeBomb.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";

export class SmokeLauncher extends SpecialWeapon {
    public tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        this.setCooldown(stack, this.getMaxCooldown(stack));

        if (world.isClient) return;

        const wave = new FireWave(3, 40);
        const spawn = () => new SmokeBomb(EntityTypes.SMOKE_BOMB, world, attacker, 1);

        let times = 3;
        const schedule = world.scheduleInterval(0.2, () => {
            if (times-- <= 0) {
                schedule.cancel();
                return;
            }

            const yaw = attacker.getYaw();
            wave.fireBulletWave(
                world as ServerWorld,
                spawn,
                attacker.getX(), attacker.getY(),
                yaw - 0.1, yaw + 0.1,
                undefined,
                '#9d9d9d',
                '#3b3b3b'
            );
        });
    }

    public getUiColor(): string {
        return '#fff';
    }
}