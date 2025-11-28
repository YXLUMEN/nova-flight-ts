import type {KeyboardInput} from "../input/KeyboardInput.ts";
import {ClientTechTree} from "../../tech/ClientTechTree.ts";
import type {World} from "../../world/World.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import type {AutoAim} from "../../tech/AutoAim.ts";
import type {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import type {UUID} from "../../apis/types.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {wrapRadians} from "../../utils/math/math.ts";
import {type ItemStack} from "../../item/ItemStack.ts";
import {PlayerMoveByPointerC2SPacket} from "../../network/packet/c2s/PlayerMoveByPointerC2SPacket.ts";
import {encodeVelocity} from "../../utils/NetUtil.ts";
import type {Item} from "../../item/Item.ts";
import {AbstractClientPlayerEntity} from "./AbstractClientPlayerEntity.ts";
import {BallisticCalculator} from "../../tech/BallisticCalculator.ts";
import type {GameProfile} from "../../server/entity/GameProfile.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerReloadC2SPacket} from "../../network/packet/c2s/PlayerReloadC2SPacket.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import {ItemCooldownManager} from "../../item/ItemCooldownManager.ts";
import type {ClientWorld} from "../ClientWorld.ts";

export class ClientPlayerEntity extends AbstractClientPlayerEntity {
    public readonly profile: GameProfile;
    public readonly input: KeyboardInput;
    public readonly bc: BallisticCalculator;
    private specialWeapons: SpecialWeapon[];
    private quickFireIndex = 0;

    private autoAimEnable: boolean = false;
    public autoAim: AutoAim | null = null;
    public steeringGear: boolean = false;
    public followPointer: boolean = false;
    public assistedAiming: boolean = false;

    public lockedMissile = new Set<MissileEntity>();
    private revision: number = 0;

    public constructor(world: World, input: KeyboardInput, profile: GameProfile) {
        super(world, ItemCooldownManager);

        this.input = input;
        this.profile = profile;
        const viewport = document.getElementById('viewport') as HTMLElement;
        this.techTree = new ClientTechTree(this, viewport);
        this.bc = new BallisticCalculator(this);

        this.specialWeapons = this.items.keys().filter(item => item instanceof SpecialWeapon).toArray();
        this.switchQuickFire();
    }

    public override tick() {
        super.tick();

        const posRef = this.getPositionRef;
        const uuid: UUID = this.getUUID();

        let dx = 0, dy = 0;
        if (this.input.isDown("ArrowLeft", "KeyA")) dx -= 1;
        if (this.input.isDown("ArrowRight", "KeyD")) dx += 1;
        if (this.input.isDown("ArrowUp", "KeyW")) dy -= 1;
        if (this.input.isDown("ArrowDown", "KeyS")) dy += 1;
        if (this.input.wasPressed('AltLeft') && this.autoAim) {
            this.autoAimEnable = !this.autoAimEnable;
            this.autoAim.setTarget(null);
            WorldConfig.autoShoot = false;
        }

        if (dx !== 0 || dy !== 0) {
            const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = this.getMovementSpeed() * speedMultiplier;
            this.updateVelocity(speed, dx, dy);
            this.getNetworkChannel().send(new PlayerMoveC2SPacket(uuid, dx, dy));
        }

        if (this.autoAimEnable && this.autoAim) {
            this.autoAim.tick();
            const pos = this.autoAim.getLockTargetPos();
            if (pos) this.getNetworkChannel().send(new PlayerAimC2SPacket(uuid, pos));
        } else if (this.steeringGear) {
            const pointer = this.input.getPointer;
            const yaw = Math.atan2(
                pointer.y - posRef.y,
                pointer.x - posRef.x
            );

            if (Math.abs(wrapRadians(yaw - this.getYaw())) > 0.02) {
                this.setClampYaw(yaw, 0.3926875);
                this.getNetworkChannel().send(new PlayerAimC2SPacket(uuid, pointer));
            }

            if (this.assistedAiming) this.bc.tick();
        } else if (this.followPointer && WorldConfig.follow) {
            const pointer = this.input.getPointer;
            const dx = pointer.x - posRef.x;
            const dy = pointer.y - posRef.y;

            if (Math.abs(dx) > 32 || Math.abs(dy) > 32) {
                const packet = new PlayerMoveByPointerC2SPacket(uuid, encodeVelocity(dx), encodeVelocity(dy));

                const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
                const speed = this.getMovementSpeed() * speedMultiplier;
                this.updateVelocity(speed, packet.dx, packet.dy);
                this.getNetworkChannel().send(packet);
            }
        }

        // 锁定
        if (this.lockedMissile.size > 0) {
            for (const missile of this.lockedMissile) {
                if (missile.isRemoved()) this.lockedMissile.delete(missile);
            }
        }

        if (this.input.wasPressed('KeyF')) {
            this.switchWeapon();
            return;
        }
        if (this.input.wasPressed('KeyR')) {
            this.wpnReload();
        }
    }

    protected override tickInventory(world: ClientWorld) {
        this.weaponFire(world);
        const currentItem = this.getCurrentItem();

        for (const [item, stack] of this.items) {
            if (item instanceof SpecialWeapon) {
                const key = this.weaponKeys.get(item)!;
                if (this.isDevMode() && item.getCooldown(stack) > 0.5) {
                    item.setCooldown(stack, 0.5);
                }
                if (item.canFire(stack) && this.input.wasPressed(key)) {
                    item.tryFire(stack, world, this);
                    this.getNetworkChannel().send(new PlayerInputC2SPacket(key));
                }
            }
            item.inventoryTick(stack, world, this, 0, currentItem === item);
        }
    }

    private weaponFire(world: ClientWorld) {
        const item = this.baseWeapons[this.currentBaseIndex];
        const stack = this.items.get(item)!;
        const isFiring = this.input.isDown("Space") || WorldConfig.autoShoot;

        const hasAmmo = stack.getDurability() > 0 || !stack.isDamageable();

        if (isFiring !== this.wasFiring) {
            if (!this.wasFiring && hasAmmo) {
                this.getNetworkChannel().send(new PlayerFireC2SPacket(true));
                item.onStartFire(stack, world, this);
            } else {
                this.getNetworkChannel().send(new PlayerFireC2SPacket(false));
                item.onEndFire(stack, world, this);
            }
            this.wasFiring = isFiring;
        }

        if (isFiring && hasAmmo && item.canFire(stack)) {
            item.tryFire(stack, world, this);
        }

        if (isFiring && stack.getDurability() === 0 && stack.isDamageable()) {
            this.wpnReload();
            this.wasFiring = false;
        }
    }

    private wpnReload() {
        const stack = this.getCurrentItemStack();
        if (stack.getDamage() === 0 || stack.getOrDefault(DataComponentTypes.RELOADING, false)) {
            return;
        }
        this.getNetworkChannel().send(new PlayerReloadC2SPacket());
        this.wasFiring = true;
    }

    public override clearItems(): void {
        super.clearItems();
        this.specialWeapons.length = 0;
    }

    public override addItem(item: Item, stack?: ItemStack): void {
        super.addItem(item, stack);
        this.specialWeapons = this.items.keys().filter(item => item instanceof SpecialWeapon).toArray();
    }

    public switchQuickFire(): void {
        this.quickFireIndex = (this.quickFireIndex + 1) % this.specialWeapons.length;
    }

    public getQuickFire() {
        return this.specialWeapons[this.quickFireIndex];
    }

    public launchQuickFire() {
        const item = this.getQuickFire();
        const stack = this.items.get(item);
        if (stack && item.canFire(stack)) {
            item.tryFire(stack, this.getWorld(), this);
            const key = this.weaponKeys.get(item)!;
            this.getNetworkChannel().send(new PlayerInputC2SPacket(key));
        }
    }

    public getRevision(): number {
        return this.revision;
    }

    public updateSlotStacks(revision: number, stacks: Iterable<ItemStack>) {
        for (const itemStack of stacks) {
            const item = itemStack.getItem();
            const playerItemStack = this.items.get(item);
            if (playerItemStack) {
                playerItemStack.applyChanges(itemStack.getComponents().getChanges());
            }
        }

        this.revision = revision;
    }

    public override switchWeapon(dir: number = 1) {
        super.switchWeapon(dir);
        this.getNetworkChannel().send(new PlayerSwitchSlotC2SPacket(this.currentBaseIndex));
    }

    public override setScore(score: number) {
        super.setScore(score);
        (this.techTree as ClientTechTree).playerScore.textContent = `点数: ${this.getScore()}`;
    }

    public override canMoveVoluntarily(): boolean {
        return true;
    }

    protected override getPermissionLevel(): number {
        return 10;
    }
}