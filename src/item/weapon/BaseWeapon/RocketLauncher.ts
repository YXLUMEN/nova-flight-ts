import type {World} from "../../../world/World.ts";
import type {ClientWorld} from "../../../client/ClientWorld.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {isClient, isServer} from "../../../configs/RuntimeConfig.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {RocketEntity} from "../../../entity/projectile/RocketEntity.ts";
import {EMPRocketEntity} from "../../../entity/projectile/EMPRocketEntity.ts";
import {BurstRocketEntity} from "../../../entity/projectile/BurstRocketEntity.ts";
import {APRocketEntity} from "../../../entity/projectile/APRocketEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {ClusterRocketEntity} from "../../../entity/projectile/ClusterRocketEntity.ts";
import {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import {Techs} from "../../../world/tech/Techs.ts";
import {ExplosionConfigs, ExplosionTag} from "../../../world/element/explosion/ExplosionConfigs.ts";

export class RocketLauncher extends BaseWeapon {
    private readonly bulletSpeed: number = 15;
    private readonly specialRate = 0.3;
    private readonly specialTable: RandomTable[] = [
        {cls: EMPRocketEntity, weight: 1, args: [1]},      // 10%
        {cls: BurstRocketEntity, weight: 2, args: [4]},      // 20%
        {cls: APRocketEntity, weight: 1, args: []},       // 10%
        {cls: ClusterRocketEntity, weight: 2, args: [8, 40]}, // 20%
    ];

    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        this.onFire(stack, world, attacker);
        this.setCooldown(stack, this.getFireRate(stack));
    }

    protected onFire(stack: ItemStack, world: World, attacker: Entity): void {
        stack.set(DataComponents.FIRING, true);

        const rocketCounts = stack.getOr(DataComponents.LAUNCH_COUNT, 8);
        const randomRocketEnable = stack.getOr(DataComponents.MISSILE_RANDOM_ENABLE, false);
        const fusion = attacker instanceof PlayerEntity && attacker.getTechs().isUnlocked(Techs.FUSION_BOMB);

        let i = 1;
        const schedule = world.scheduleInterval(0.1, () => {
            if (i++ > rocketCounts) {
                schedule.cancel();
                stack.remove(DataComponents.FIRING);
                if (isServer && attacker.isPlayer()) {
                    (attacker as ServerPlayerEntity).syncStack(stack);
                }
                return;
            }

            if (isClient) {
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
                rocket = new RocketEntity(
                    EntityTypes.ROCKET_ENTITY,
                    world,
                    attacker,
                    undefined, undefined,
                    new ExplosionConfigs(undefined, fusion ? ExplosionTag.FUSION : ExplosionTag.NONE),
                );
                rocket.explosionDamage = stack.getOr(DataComponents.EXPLOSION_POWER, 12);
                rocket.explosionRadius = stack.getOr(DataComponents.EXPLOSION_RADIUS, 72);
            }

            this.setBullet(rocket, attacker, this.bulletSpeed, 4, 2);
            (world as ServerWorld).spawnEntity(rocket);
            const yaw = attacker.getYaw();
            attacker.updateVelocity(-0.6, Math.cos(yaw), Math.sin(yaw));
        });

        world.playSound(attacker, SoundEvents.MISSILE_LAUNCH, 0.5);
    }

    public override getUiColor(): string {
        return "#ffdc92";
    }

    public override getBallisticSpeed(): number {
        return this.bulletSpeed;
    }

    public override getMaxSpread(): number {
        return 2;
    }

    protected override getAmmoConsume(): number {
        return 0;
    }

    public override shouldCooldown(stack: ItemStack): boolean {
        return !stack.getOr(DataComponents.FIRING, false);
    }

    private randomRocket(world: World, attacker: Entity): RocketEntity | null {
        if (Math.random() >= this.specialRate) return null;

        const total = this.specialTable.reduce((s, e) => s + e.weight, 0);
        let r = Math.random() * total;
        for (const entry of this.specialTable) {
            r -= entry.weight;
            if (r > 0) continue;

            const Ctor = entry.cls;
            return new Ctor(EntityTypes.ROCKET_ENTITY, world, attacker, ...entry.args);
        }
        return null;
    }
}

type RandomTable = { cls: typeof RocketEntity; weight: number; args: number[] };