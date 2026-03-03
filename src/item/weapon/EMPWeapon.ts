import type {World} from "../../world/World.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import type {ServerPlayerEntity} from "../../server/entity/ServerPlayerEntity.ts";

export class EMPWeapon extends SpecialWeapon {
    private readonly duration = 600;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        world.events.emit(EVENTS.EMP_BURST, {entity: attacker, duration: this.duration});

        const radius = stack.getOrDefault(DataComponents.EFFECT_RANGE, 480);
        world.createEMP(attacker, attacker.getPositionRef, radius, this.duration, 1);
        this.setCooldown(stack, this.getMaxCooldown(stack));

        if (!world.isClient && attacker.isPlayer()) {
            (attacker as ServerPlayerEntity).syncStack(stack);
        }
    }

    public override getDisplayName(): string {
        return 'EMP';
    }

    public override getUiColor(): string {
        return '#5ec8ff'
    }

    public override getSortIndex(): number {
        return 1;
    }
}