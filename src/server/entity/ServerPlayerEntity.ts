import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ServerTechTree} from "../../tech/ServerTechTree.ts";
import type {World} from "../../world/World.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import type {ItemStack} from "../../item/ItemStack.ts";
import {clamp} from "../../utils/math/math.ts";
import type {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import type {ServerNetworkChannel} from "../network/ServerNetworkChannel.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {InventoryS2CPacket} from "../../network/packet/s2c/InventoryS2CPacket.ts";


export class ServerPlayerEntity extends PlayerEntity {
    private readonly inputKeys = new Set<string>();
    private readonly changedItems: Set<ItemStack> = new Set();

    private revision = 0;

    public constructor(world: ServerWorld) {
        super(world);

        this.techTree = new ServerTechTree(this);
    }

    public override tick() {
        super.tick();
        if (this.wasActive) this.handleFire();
        this.inputKeys.clear();

        if (this.changedItems.size > 0) {
            const packet = new InventoryS2CPacket(0, this.nextRevision(), this.changedItems);
            (this.getNetworkChannel() as ServerNetworkChannel).sendTo(packet, this.getUuid());
            this.changedItems.clear();
        }
    }

    public setFiring(active: boolean) {
        this.wasActive = active;

        const current = this.getCurrentItemStack();
        const item = current.getItem() as BaseWeapon;
        if (active) {
            item.onStartFire(current, this.getWorld(), this);
        } else {
            item.onEndFire(current, this.getWorld(), this);
        }
    }

    public handleFire() {
        const item = this.baseWeapons[this.currentBaseIndex];
        const stack = this.weapons.get(item)!;
        if (item.canFire(stack)) {
            item.tryFire(stack, this.getWorld(), this);
        }
    }

    public setCurrentItem(slot: number) {
        const current = this.getCurrentItemStack();
        this.getCurrentItem().onEndFire(current, this.getWorld(), this);
        this.currentBaseIndex = clamp(slot, 0, this.baseWeapons.length - 1);
    }

    protected override tickInventory(world: World) {
        for (const [item, stack] of this.weapons) {
            if (item instanceof SpecialWeapon) {
                if (WorldConfig.devMode && item.getCooldown(stack) > 0.5) {
                    item.setCooldown(stack, 0.5);
                    this.changedItems.add(stack);
                }
                if (item.canFire(stack) && this.inputKeys.delete(item.bindKey())) {
                    item.tryFire(stack, world, this);
                }
            }
            item.inventoryTick(stack, world, this, 0, true);
        }
    }

    public addChange(itemStack: ItemStack): void {
        this.changedItems.add(itemStack);
    }

    public override setScore(score: number) {
        super.setScore(score);
        (this.getNetworkChannel() as ServerNetworkChannel).sendTo(new PlayerSetScoreS2CPacket(score), this.getUuid());
    }

    public nextRevision(): number {
        this.revision = this.revision + 1 & 32767;
        return this.revision;
    }

    public handlerInput(key: string) {
        switch (key) {
            case 'KeyR':
                this.switchWeapon();
                break;
            case 'Space':
                this.handleFire();
                break;
            default:
                this.inputKeys.add(key);
                break;
        }
    }
}