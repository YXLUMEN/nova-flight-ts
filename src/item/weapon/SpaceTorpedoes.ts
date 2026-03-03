import type {Entity} from "../../entity/Entity.ts";
import type {World} from "../../world/World.ts";
import type {ItemStack} from "../ItemStack.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import {TorpedoEntity} from "../../entity/projectile/TorpedoEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";

export class SpaceTorpedoes extends SpecialWeapon {
    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        const pos = attacker.getPositionRef;
        const torpedoesCount = stack.getOrDefault(DataComponents.LAUNCH_COUNT, 6);
        const hitDamage = stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 12);
        const explosionDamage = stack.getOrDefault(DataComponents.EXPLOSION_DAMAGE, 12);
        const explosionRadius = stack.getOrDefault(DataComponents.EXPLOSION_RADIUS, 64);

        let i = 1;
        const schedule = world.scheduleInterval(0.3, () => {
            if (i++ > torpedoesCount) {
                schedule.cancel();
                return;
            }

            world.playSound(attacker, SoundEvents.TORPEDOES_FIRE, 0.5);
            if (world.isClient) return;

            const yaw = attacker.getYaw();
            const torpedo = new TorpedoEntity(EntityTypes.TORPEDO_ENTITY, world, attacker, yaw, hitDamage);
            torpedo.explosionDamage = explosionDamage;
            torpedo.explosionRadius = explosionRadius;
            torpedo.color = '#6c4b00';
            torpedo.setYaw(yaw);
            torpedo.setPosition(pos.x, pos.y);
            (world as ServerWorld).spawnEntity(torpedo);
            world.getNetworkChannel().send(new MissileSetS2CPacket(torpedo.getId(), torpedo.driftAngle, torpedo.hoverDir));
        });

        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    public override getUiColor(): string {
        return '#d19000';
    }

    public override getDisplayName(): string {
        return '鱼雷发射器';
    }

    public override getSortIndex(): number {
        return 0;
    }
}