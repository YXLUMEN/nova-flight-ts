import {BaseWeapon} from "./BaseWeapon.ts";
import {type ItemStack} from "../../ItemStack.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {type Entity} from "../../../entity/Entity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {ArtilleryEntity} from "../../../entity/projectile/ArtilleryEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {World} from "../../../world/World.ts";

export class KineticArtillery extends BaseWeapon {
    public static readonly SPEED = 50;

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, _slot: number, selected: boolean) {
        const cooldown = this.getCooldown(stack);
        if (cooldown > 0 && this.shouldCooldown(stack)) {
            this.setCooldown(stack, cooldown - 1);

            if (world.isClient && (cooldown | 0) === 12 && stack.getDurability() !== 0) {
                world.playSound(null, SoundEvents.KINETIC_ARTILLERY_LOAD);
            }
        }

        if (!holder.isPlayer() || world.isClient) return;
        if (stack.getOrDefault(DataComponents.RELOADING, false)) {
            this.reloadAction(holder, stack, selected);
        }
    }

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new ArtilleryEntity(EntityTypes.KINETIC_ARTILLERY_ENTITY,
            world,
            attacker,
            stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 32)
        );
        this.setBullet(bullet, attacker, KineticArtillery.SPEED, 8, 0);
        world.spawnEntity(bullet);

        world.playSound(null, SoundEvents.KINETIC_ARTILLERY_FIRE, 0.4);
    }

    public override getUiColor(): string {
        return '#ffdddd';
    }

    public override getDisplayName(): string {
        return '动能火炮';
    }

    public override getBallisticSpeed(): number {
        return KineticArtillery.SPEED;
    }

    protected override getMuzzleParticles(): number {
        return 8;
    }
}