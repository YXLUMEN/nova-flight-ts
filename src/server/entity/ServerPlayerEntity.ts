import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ServerTechTree} from "../../tech/ServerTechTree.ts";
import type {World} from "../../world/World.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import type {ItemStack} from "../../item/ItemStack.ts";
import {clamp} from "../../utils/math/math.ts";
import type {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import type {ServerNetworkChannel} from "../network/ServerNetworkChannel.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {InventoryS2CPacket} from "../../network/packet/s2c/InventoryS2CPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import type {GameProfile} from "./GameProfile.ts";
import {type DamageSource} from "../../entity/damage/DamageSource.ts";
import type {ServerPlayNetworkHandler} from "../network/ServerPlayNetworkHandler.ts";


export class ServerPlayerEntity extends PlayerEntity {
    public readonly playerProfile: GameProfile;

    public networkHandler!: ServerPlayNetworkHandler;
    private readonly inputKeys = new Set<string>();
    private readonly changedItems: Set<ItemStack> = new Set();

    private revision = 0;

    public constructor(world: ServerWorld, playerProfile: GameProfile) {
        super(world);

        this.playerProfile = playerProfile;
        this.techTree = new ServerTechTree(this);
    }

    public override tick() {
        super.tick();
        if (this.wasActive) this.handleFire();
        this.inputKeys.clear();

        if (this.changedItems.size > 0) {
            const packet = new InventoryS2CPacket(0, this.nextRevision(), this.changedItems);
            (this.getNetworkChannel() as ServerNetworkChannel).sendTo(packet, this.getUUID());
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
        const stack = this.items.get(item)!;
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
        const isDev = this.isDevMode();

        for (const [item, stack] of this.items) {
            if (item instanceof SpecialWeapon) {
                const key = this.weaponKeys.get(item)!;
                if (isDev && item.getCooldown(stack) > 0.5) {
                    item.setCooldown(stack, 0.5);
                    this.changedItems.add(stack);
                }
                if (item.canFire(stack) && this.inputKeys.delete(key)) {
                    item.tryFire(stack, world, this);
                }
            }
            item.inventoryTick(stack, world, this, 0, true);
        }
    }

    public addChange(itemStack: ItemStack): void {
        this.changedItems.add(itemStack);
    }

    public override isInvulnerableTo(damageSource: DamageSource): boolean {
        return super.isInvulnerableTo(damageSource) || this.isDevMode();
    }

    public override kill() {
        if (this.isDevMode()) return;
        super.kill();
    }

    public override addScore(score: number) {
        super.addScore(score);
        (this.getWorld() as ServerWorld).addPhase(score);
    }

    public override setScore(score: number) {
        super.setScore(score);
        (this.getNetworkChannel() as ServerNetworkChannel).sendTo(new PlayerSetScoreS2CPacket(score), this.getUUID());
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

    public getProfile(): GameProfile {
        return this.playerProfile;
    }

    protected override getPermissionLevel(): number {
        const server = this.getWorld().getServer();
        if (!server) return 0;

        return server.isHost(this.getProfile()) ? 9 : super.getPermissionLevel();
    }

    public override sendMessage(msg: string) {
        (this.getNetworkChannel() as ServerNetworkChannel).sendTo(new GameMessageS2CPacket(msg), this.getUUID());
    }
}