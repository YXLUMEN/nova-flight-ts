import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {C125BulletEntity} from "../../../entity/projectile/C125BulletEntity.ts";
import {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import {Techs} from "../../../tech/Techs.ts";

export class Artillery125 extends BaseWeapon {
    private readonly speed = 14;

    protected onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const fusion = attacker instanceof PlayerEntity && attacker.getTechs().isUnlocked(Techs.FUSION_BOMB);

        const bullet = new C125BulletEntity(EntityTypes.EXPLODE_BULLET_ENTITY,
            world,
            attacker,
            stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1),
            {
                explosionRadius: stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 16),
                damage: stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 5),
                sparks: 6,
                fastSparks: 3,
                behaviour: fusion ? 'fusion' : undefined,
            });

        this.setBullet(bullet, attacker, this.speed, 20, 1);
        world.spawnEntity(bullet);
        world.playSound(null, SoundEvents.CANNON125_FIRE, 0.3);
    }

    public getUiColor(): string {
        return '#c18505';
    }

    public override getDisplayName(): string {
        return '125火炮';
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }

    protected override getMuzzleParticles(): number {
        return 12;
    }
}