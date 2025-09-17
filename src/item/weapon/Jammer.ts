import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {ItemStack} from "../ItemStack.ts";
import type {World} from "../../world/World.ts";
import type {Entity} from "../../entity/Entity.ts";
import {DecoyEntity} from "../../entity/DecoyEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {HALF_PI, rand} from "../../utils/math/math.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";

export class Jammer extends SpecialWeapon {
    private readonly countPerRelease = 8;
    private readonly releaseTimes = 4;

    public tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        const pos = attacker.getPositionRef;
        const yaw = attacker.getYaw();

        const radius = 1.5;
        const backOffset = -0.5;
        const spread = Math.PI / 3;
        let count = 0;

        const schedule = world.scheduleInterval(0.2, () => {
            if (count++ >= this.releaseTimes) {
                schedule.cancel();
                return;
            }

            for (let i = 0; i < this.countPerRelease; i++) {
                const t = (i / (this.countPerRelease - 1)) - 0.5;
                const angle = yaw + t * spread;

                const offsetX = Math.cos(angle) * radius + Math.cos(yaw) * backOffset;
                const offsetY = Math.sin(angle) * radius + Math.sin(yaw) * backOffset;

                const decoy = new DecoyEntity(EntityTypes.DECOY_ENTITY, world, attacker);
                decoy.setPosition(pos.x + offsetX, pos.y + offsetY);

                const sideAngle = yaw + rand(-0.26179935, 0.26179935) + HALF_PI * (t >= 0 ? 1 : -1);
                decoy.setYaw(sideAngle);
                decoy.updateVelocity(8, Math.cos(sideAngle), Math.sin(sideAngle));

                world.spawnEntity(decoy);
            }
            SoundSystem.playSound(SoundEvents.DECOY_FIRE);
        });

        this.setCooldown(stack, this.getMaxCooldown(stack));
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
}