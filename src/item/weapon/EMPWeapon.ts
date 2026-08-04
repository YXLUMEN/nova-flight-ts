import type {World} from "../../world/World.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import type {ServerPlayerEntity} from "../../server/entity/ServerPlayerEntity.ts";
import {EmpBurstEvent} from "../../event/events/EmpBurstEvent.ts";
import {Emp} from "../../world/element/Emp.ts";

export class EMPWeapon extends SpecialWeapon {
    private readonly duration = 600;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        world.events.emit(new EmpBurstEvent(attacker, this.duration));

        const radius = stack.getOr(DataComponents.EFFECT_RANGE, 480);
        world.applyElement(Emp.create(attacker, attacker.positionRef, radius, this.duration, 1));
        this.setCooldown(stack, this.getMaxCooldown(stack));

        if (!world.isClient && attacker.isPlayer()) {
            (attacker as ServerPlayerEntity).syncStack(stack);
        }
    }

    public override getUiColor(): string {
        return '#5ec8ff';
    }
}