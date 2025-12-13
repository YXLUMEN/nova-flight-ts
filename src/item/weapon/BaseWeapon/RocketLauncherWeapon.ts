import {BaseWeapon} from "./BaseWeapon.ts";
import {type World} from "../../../world/World.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {RocketEntity} from "../../../entity/projectile/RocketEntity.ts";
import {EMPRocketEntity} from "../../../entity/projectile/EMPRocketEntity.ts";
import {BurstRocketEntity} from "../../../entity/projectile/BurstRocketEntity.ts";
import {APRocketEntity} from "../../../entity/projectile/APRocketEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {type Entity} from "../../../entity/Entity.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {ClusterRocketEntity} from "../../../entity/projectile/ClusterRocketEntity.ts";
import type {ClientWorld} from "../../../client/ClientWorld.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {EntityPositionForceS2CPacket} from "../../../network/packet/s2c/EntityPositionForceS2CPacket.ts";

export class RocketLauncherWeapon extends BaseWeapon {
    private static readonly BULLET_SPEED: number = 15;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        this.onFire(stack, world, attacker);
        this.setCooldown(stack, this.getFireRate(stack));
    }

    protected onFire(stack: ItemStack, world: World, attacker: Entity) {
        stack.set(DataComponentTypes.WEAPON_CAN_COOLDOWN, false);

        const rocketCounts = stack.getOrDefault(DataComponentTypes.MISSILE_COUNT, 8);
        const randomRocketEnable = stack.getOrDefault(DataComponentTypes.MISSILE_RANDOM_ENABLE, false);

        let i = 1;
        const schedule = world.scheduleInterval(0.1, () => {
            if (i++ > rocketCounts) {
                schedule.cancel();
                stack.set(DataComponentTypes.WEAPON_CAN_COOLDOWN, true);
                if (!world.isClient && attacker.isPlayer()) {
                    (attacker as ServerPlayerEntity).networkHandler?.send(EntityPositionForceS2CPacket.create(attacker));
                    (attacker as ServerPlayerEntity).syncStack(stack);
                }
                return;
            }

            if (world.isClient) {
                this.spawnMuzzle(world as ClientWorld, attacker, this.getMuzzleParticles());
                const yaw = attacker.getYaw();
                attacker.updateVelocity(-0.6, Math.cos(yaw), Math.sin(yaw));
                return;
            }

            let rocket: RocketEntity | null = null;
            if (randomRocketEnable) {
                rocket = this.randomRocket(world, attacker);
            }
            if (rocket === null) {
                rocket = new RocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker);
                rocket.explosionDamage = stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 12);
                rocket.explosionRadius = stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 72);
            }

            this.setBullet(rocket, attacker, RocketLauncherWeapon.BULLET_SPEED, 4, 2);
            (world as ServerWorld).spawnEntity(rocket);
            const yaw = attacker.getYaw();
            attacker.updateVelocity(-0.6, Math.cos(yaw), Math.sin(yaw));
        });

        world.playSound(attacker, SoundEvents.MISSILE_LAUNCH, 0.5);
    }

    public override getDisplayName(): string {
        return "火箭发射器";
    }

    public override getUiColor(): string {
        return "#ffdc92";
    }

    public override getBallisticSpeed(): number {
        return RocketLauncherWeapon.BULLET_SPEED;
    }

    protected override getAmmoConsume(): number {
        return 0;
    }

    public override shouldCooldown(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.WEAPON_CAN_COOLDOWN, false);
    }

    private randomRocket(world: World, attacker: Entity): RocketEntity | null {
        const rnd = Math.random();
        if (rnd < 0.1) {
            return new EMPRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker, 1);
        } else if (rnd < 0.3) {
            return new BurstRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker, 4);
        } else if (rnd < 0.4) {
            return new APRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker);
        } else if (rnd < 0.6) {
            return new ClusterRocketEntity(EntityTypes.ROCKET_ENTITY, world, attacker, 8, 40);
        }
        return null;
    }
}