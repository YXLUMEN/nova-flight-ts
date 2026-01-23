import {World} from "../../world/World.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import {VisualEffectTypes} from "../../effect/VisualEffectTypes.ts";
import type {ServerPlayerEntity} from "../../server/entity/ServerPlayerEntity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {squareDistVec2} from "../../utils/math/math.ts";

export class EMPWeapon extends SpecialWeapon {
    private readonly duration = 600;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        world.events.emit(EVENTS.EMP_BURST, {entity: attacker, duration: this.duration});

        const radius = stack.getOrDefault(DataComponentTypes.EFFECT_RANGE, 480);
        const r2 = radius * radius;

        for (const entity of world.getProjectiles()) {
            if (entity.getOwner() !== attacker) entity.discard();
        }

        const pos = attacker.getPositionRef;
        for (const entity of world.getMobs()) {
            if (entity.isRemoved() || squareDistVec2(pos, entity.getPositionRef) > r2) continue;
            entity.addStatusEffect(new StatusEffectInstance(StatusEffects.EMC_STATUS, this.duration, 1), null);
        }

        world.playSound(attacker, SoundEvents.EMP_BURST);
        this.setCooldown(stack, this.getMaxCooldown(stack));

        if (world.isClient) return;

        (world as ServerWorld).spawnEffect(null, VisualEffectTypes.EMP_BURST.create(
            attacker.getPositionRef,
            radius,
        ));

        if (attacker.isPlayer()) {
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