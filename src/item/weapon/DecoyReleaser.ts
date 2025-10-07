import {SpecialWeapon} from "./SpecialWeapon.ts";
import {type ItemStack} from "../ItemStack.ts";
import type {World} from "../../world/World.ts";
import type {Entity} from "../../entity/Entity.ts";
import {DecoyEntity} from "../../entity/DecoyEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {HALF_PI, rand} from "../../utils/math/math.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class DecoyReleaser extends SpecialWeapon {
    private readonly countPerRelease = 8;
    private readonly releaseTimes = 4;

    private readonly sustainPerRelease = 2;
    private readonly sustainReleaseTimes = 8;

    public tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        stack.set(DataComponentTypes.WEAPON_CAN_COOLDOWN, false);

        let quickReCount = 0;
        let sustainReCount = 0;

        const sustainSchedule = world.scheduleInterval(1.0, () => {
            if (sustainReCount++ > this.sustainReleaseTimes) {
                sustainSchedule.cancel();
                stack.set(DataComponentTypes.WEAPON_CAN_COOLDOWN, true);
                return;
            }

            DecoyReleaser.releaseDecoy(this.sustainPerRelease, world, attacker);
        });

        const quickSchedule = world.scheduleInterval(0.2, () => {
            if (quickReCount++ >= this.releaseTimes) {
                quickSchedule.cancel();
                return;
            }

            DecoyReleaser.releaseDecoy(this.countPerRelease, world, attacker);
        });

        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    private static releaseDecoy(perRelease: number, world: World, attacker: Entity): void {
        if (!world.isClient) {
            const pos = attacker.getPositionRef;
            const yaw = attacker.getYaw();

            for (let i = 0; i < perRelease; i++) {
                const t = (i / (perRelease - 1)) - 0.5;
                const angle = yaw + t * Math.PI / 3;

                const offsetX = Math.cos(angle) * 1.5 + Math.cos(yaw) * -0.5;
                const offsetY = Math.sin(angle) * 1.5 + Math.sin(yaw) * -0.5;

                const decoy = new DecoyEntity(EntityTypes.DECOY_ENTITY, world, attacker);
                decoy.setPosition(pos.x + offsetX, pos.y + offsetY);

                const sideAngle = yaw + rand(-0.26179935, 0.26179935) + HALF_PI * (t >= 0 ? 1 : -1);
                decoy.setYaw(sideAngle);
                decoy.updateVelocity(8, Math.cos(sideAngle), Math.sin(sideAngle));

                (world as ServerWorld).spawnEntity(decoy);
            }
        }
        world.playSound(attacker, SoundEvents.DECOY_FIRE);
    }

    public override bindKey(): string {
        return "KeyX";
    }

    public override getUiColor(): string {
        return "#fffeb7";
    }

    public override getDisplayName(): string {
        return "干扰弹";
    }

    public override shouldCooldown(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.WEAPON_CAN_COOLDOWN, true);
    }
}