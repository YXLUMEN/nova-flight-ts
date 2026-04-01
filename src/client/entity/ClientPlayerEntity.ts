import type {KeyboardInput} from "../input/KeyboardInput.ts";
import {ClientTechTree} from "../tech/ClientTechTree.ts";
import type {World} from "../../world/World.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import type {AutoAim} from "../tech/AutoAim.ts";
import type {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {clamp, squareDistVec2, wrapRadians} from "../../utils/math/math.ts";
import {type ItemStack} from "../../item/ItemStack.ts";
import {type Item} from "../../item/Item.ts";
import {AbstractClientPlayerEntity} from "./AbstractClientPlayerEntity.ts";
import {BallisticCalculator} from "../tech/BallisticCalculator.ts";
import type {GameProfile} from "../../server/entity/GameProfile.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerReloadC2SPacket} from "../../network/packet/c2s/PlayerReloadC2SPacket.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import {ItemCooldownManager} from "../../item/ItemCooldownManager.ts";
import type {ClientWorld} from "../ClientWorld.ts";
import {FullMove, PositionOnly, Steering} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {BlockChangeC2SPacket} from "../../network/packet/c2s/BlockChangeC2SPacket.ts";
import {BlockPos} from "../../world/map/BlockPos.ts";
import type {BlockChange} from "../../world/map/BlockChange.ts";
import {BatchBlockChangesPacket} from "../../network/packet/BatchBlockChangesPacket.ts";
import type {Channel} from "../../network/Channel.ts";
import {Weapon} from "../../item/weapon/Weapon.ts";
import {FireSpecialC2SPacket} from "../../network/packet/c2s/FireSpecialC2SPacket.ts";
import {ClientInventory} from "../ClientInventory.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";

export class ClientPlayerEntity extends AbstractClientPlayerEntity {
    public readonly profile: GameProfile;
    public readonly input: KeyboardInput;

    public readonly clientInventory: ClientInventory;

    private quickFireIndex = 0;
    private readonly activeSpecials: Map<string, SpecialWeapon>;
    private readonly orderSpecials: SpecialWeapon[];

    private autoAimEnable: boolean = false;
    public autoAim: AutoAim | null = null;

    public bc: BallisticCalculator | null = null;

    public steeringGear: boolean = false;
    public followPointer: boolean = false;

    public readonly lockedMissile = new Set<MissileEntity>();
    public readonly approachMissile = new Set<MissileEntity>();
    private revision: number = 0;

    public constructor(world: World, input: KeyboardInput, profile: GameProfile) {
        super(world, ItemCooldownManager);

        this.input = input;
        this.profile = profile;
        this.clientInventory = new ClientInventory(this);
        this.techTree = new ClientTechTree(this);

        this.giveInitWeapon();

        this.activeSpecials = new Map();
        this.orderSpecials = [];
    }

    public override tick() {
        super.tick();

        // 锁定
        if (this.lockedMissile.size > 0) {
            const pos = this.getPositionRef;
            for (const missile of this.lockedMissile.keys()) {
                if (missile.isRemoved() || missile.getTarget() !== this) {
                    this.lockedMissile.delete(missile);
                    this.approachMissile.delete(missile);
                    continue;
                }
                if (squareDistVec2(missile.getPositionRef, pos) <= 1E5) {
                    this.approachMissile.add(missile);
                } else {
                    this.approachMissile.delete(missile);
                }
            }
        }

        // debug
        if (this.input.isDown('KeyL')) {
            const pos = this.input.getWorldPointer();
            this.placeBlock(0, pos.x, pos.y);
        }

        if (this.input.isDown('KeyP')) {
            const pos = this.input.getWorldPointer();
            this.placeBlock(1, pos.x, pos.y);
        }

        if (this.input.wasPressed('KeyO')) {
            let {x, y} = this.input.getWorldPointer();
            x = BlockPos.alignValue(x);
            y = BlockPos.alignValue(y);

            const places: BlockChange[] = [];
            for (let i = 0; i < 20; i++) {
                for (let j = 0; j < 20; j++) {
                    places.push({type: 1, x: x + i, y: y + j});
                }
            }
            this.placeBlocks(places);
        }

        if (this.input.wasPressed('KeyF')) {
            this.switchWeapon();
        } else if (this.input.wasPressed('KeyR')) {
            this.wpnReload();
        }
    }

    public override aiStep() {
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

        let updatePos = dx !== 0 || dy !== 0;
        let updateYaw = false;

        if (this.autoAimEnable && this.autoAim) {
            const yaw = this.getYaw();
            this.autoAim.tick();

            if (Math.abs(wrapRadians(this.getYaw() - yaw)) > 1E-3) {
                updateYaw = true;
            }
        } else if (this.steeringGear) {
            const pos = this.getPositionRef;
            const pointer = this.input.getWorldPointer();
            const yaw = Math.atan2(
                pointer.y - pos.y,
                pointer.x - pos.x
            );

            if (Math.abs(wrapRadians(this.getYaw() - yaw)) > 0.01) {
                this.setClampYaw(yaw, 0.3926875);
                updateYaw = true;
            }
            if (this.bc) this.bc.tick();
        } else if (this.followPointer && WorldConfig.follow) {
            const pos = this.getPositionRef;
            const pointer = this.input.getWorldPointer();
            const pdx = pointer.x - pos.x;
            const pdy = pointer.y - pos.y;

            if (Math.abs(pdx) > 32 || Math.abs(pdy) > 32) {
                dx = Math.sign(pdx);
                dy = Math.sign(pdy);
                updatePos = true;
            }
        }

        if (updatePos) {
            const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = this.getMovementSpeed() * speedMultiplier;
            this.updateVelocity(speed, dx, dy);
        }

        super.aiStep();
        this.tryFireWeapons();

        if (updatePos && updateYaw) {
            this.getNetworkChannel().send(new FullMove(dx, dy, this.getYaw()));
        } else if (updatePos) {
            this.getNetworkChannel().send(new PositionOnly(dx, dy));
        } else if (updateYaw) {
            this.getNetworkChannel().send(new Steering(this.getYaw()));
        }
    }

    private tryFireWeapons() {
        const world = this.getWorld() as ClientWorld;
        this.mainWeaponFire(world);

        const inventory = this.getInventory();
        for (const [assign, item] of this.activeSpecials) {
            const stack = inventory.searchItem(item);
            if (stack.isEmpty()) continue;

            const bind = item.bindKey();
            const key = bind === null ? assign : bind;

            if (this.input.wasPressed(key) && item.canFire(stack)) {
                item.tryFire(stack, world, this);
                this.getNetworkChannel().send(new FireSpecialC2SPacket(item));
            }
        }
    }

    private mainWeaponFire(world: ClientWorld) {
        const stack = this.getInventory().getSelectedItem();
        const item = stack.getItem();
        if (stack.isEmpty() || !(item instanceof Weapon)) return;

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
        const stack = this.getInventory().getSelectedItem();
        if (stack.getDamage() === 0 || stack.getOrDefault(DataComponents.RELOADING, false)) {
            return;
        }
        this.getNetworkChannel().send(new PlayerReloadC2SPacket());
        this.wasFiring = true;
    }

    public reloadActiveSpecials() {
        if (!this.activeSpecials) return;
        this.activeSpecials.clear();
        this.orderSpecials.length = 0;

        const inventory = this.getInventory();
        const len = inventory.hotbarLength();
        const sLen = inventory.specialLength();

        for (let i = 0; i < inventory.maxSize(); i++) {
            if (i < len) continue;
            if (i >= sLen) break;

            const stack = inventory.getItem(i);
            const item = stack.getItem();
            if (!stack.isEmpty() && item instanceof SpecialWeapon) {
                this.orderSpecials.push(item);
                this.activeSpecials.set(`Digit${this.orderSpecials.length}`, item);
            }
        }
        this.quickFireIndex = clamp(this.quickFireIndex, 0, this.orderSpecials.length - 1);
    }

    public getActiveSpecials() {
        return this.orderSpecials;
    }

    public override clearItems(): void {
        super.clearItems();
        this.activeSpecials.clear();
        this.orderSpecials.length = 0;
    }

    public override addItem(item: Item, stack?: ItemStack): void {
        super.addItem(item, stack);
        this.reloadActiveSpecials();
    }

    public override removeItem(item: Item): boolean {
        const result = super.removeItem(item);
        this.reloadActiveSpecials();
        return result;
    }

    public isOpenInventory() {
        return this.clientInventory.isOpen;
    }

    public setOpenInventory(value: boolean) {
        this.clientInventory.isOpen = value;
        if (!value) this.clientInventory.reset();
    }

    public switchQuickFire(): void {
        this.quickFireIndex = (this.quickFireIndex + 1) % this.orderSpecials.length;
    }

    public getQuickFire() {
        return this.orderSpecials[this.quickFireIndex];
    }

    public launchQuickFire() {
        const item = this.getQuickFire();
        const stack = this.getInventory().searchItem(item);
        if (!stack.isEmpty() && item.canFire(stack)) {
            item.tryFire(stack, this.getWorld(), this);
            this.getNetworkChannel().send(new FireSpecialC2SPacket(item));
        }
    }

    public placeBlock(type: number, x: number, y: number): void {
        const map = this.getWorld().getMap();
        if (map.getAt(x, y) === type) return;
        this.getNetworkChannel().send(new BlockChangeC2SPacket(type, BlockPos.alignValue(x), BlockPos.alignValue(y)));
    }

    public placeBlocks(changes: BlockChange[]): void {
        if (changes.length > 680) changes.length = 680;
        const map = this.getWorld().getMap();
        const solid = changes
            .filter(change => map.get(change.x, change.y) === 0);

        this.getNetworkChannel().send(BatchBlockChangesPacket.from(solid));
    }

    public getRevision(): number {
        return this.revision;
    }

    public updateSlotStacks(revision: number, stacks: Iterable<ItemStack>) {
        const inventory = this.getInventory();
        for (const stack of stacks) {
            const item = stack.getItem();
            const playerStack = inventory.searchItem(item);
            if (!playerStack.isEmpty()) {
                playerStack.applyUnvalidatedChanges(stack.getComponents().getChanges());
            }
            if (!inventory.hasItem(item)) this.addItem(item, stack);
        }

        this.revision = revision;
    }

    public override switchWeapon(dir: number = 1) {
        super.switchWeapon(dir);
        this.getNetworkChannel().send(new PlayerSwitchSlotC2SPacket(this.getInventory().getSelectedSlot()));
    }

    public override addScore(score: number): void {
        super.addScore(score);
        const world = this.getWorld() as ClientWorld;
        world.setTotalScore(world.getTotalScore() + score);
    }

    public override setScore(score: number) {
        super.setScore(score);
        (this.getWorld() as ClientWorld).setTotalScore(score);
        (this.techTree as ClientTechTree).playerScore.textContent = `点数: ${this.getScore()}`;
    }

    public override canMoveVoluntarily(): boolean {
        return true;
    }

    protected override getPermissionLevel(): number {
        return 10;
    }

    public getNetworkChannel(): Channel {
        return this.getWorld().getNetworkChannel();
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.reloadActiveSpecials();
    }
}