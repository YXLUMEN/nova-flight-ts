import type {Entity} from "../../entity/Entity.ts";
import type {World} from "../../world/World.ts";
import type {ItemStack} from "../ItemStack.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {TrailblazerEntity} from "../../entity/TrailblazerEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class AreaBombing extends SpecialWeapon {
    public tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        this.setCooldown(stack, this.getMaxCooldown(stack));

        if (world.isClient) return;
        const power = stack.getOr(DataComponents.EXPLOSION_POWER, 32);

        const trailblazer = new TrailblazerEntity(EntityTypes.TRAILBLAZER_ENTITY, world, attacker, power);
        const yaw = attacker.getYaw();
        trailblazer.setPositionByVec(attacker.positionRef);
        trailblazer.setYaw(yaw);
        trailblazer.setVelocity(Math.cos(yaw) * 24, Math.sin(yaw) * 24);
        trailblazer.velocityModified = true;
        (world as ServerWorld).spawnEntity(trailblazer);
    }

    public getUiColor(): string {
        return '#ff22c3';
    }
}