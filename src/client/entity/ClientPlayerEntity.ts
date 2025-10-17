import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
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
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import type {UUID} from "../../apis/registry.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {wrapRadians} from "../../utils/math/math.ts";
import type {ItemStack} from "../../item/ItemStack.ts";

export class ClientPlayerEntity extends PlayerEntity {
    public readonly input: KeyboardInput;

    private autoAimEnable: boolean = false;
    public autoAim: AutoAim | null = null;
    public steeringGear: boolean = false;

    public lockedMissile = new Set<MissileEntity>();
    private revision: number = 0;

    public constructor(world: World, input: KeyboardInput) {
        super(world);

        this.input = input;
        const viewport = document.getElementById('viewport') as HTMLElement;
        this.techTree = new ClientTechTree(viewport);
    }

    public override tick() {
        super.tick();

        const posRef = this.getPositionRef;
        const uuid: UUID = this.getUuid();

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
        }

        // 锁定
        if (this.lockedMissile.size > 0) {
            for (const missile of this.lockedMissile) {
                if (missile.isRemoved()) this.lockedMissile.delete(missile);
            }
        }

        if (this.input.wasPressed('KeyR')) {
            this.switchWeapon();
            return;
        }
    }

    protected override tickInventory(world: World) {
        const baseWeapon = this.baseWeapons[this.currentBaseIndex];
        const stack = this.weapons.get(baseWeapon)!;
        const fire = this.input.isDown("Space") || WorldConfig.autoShoot;
        const active = stack.isAvailable() && fire;

        if (active !== this.wasActive) {
            if (!this.wasActive) {
                this.getNetworkChannel().send(new PlayerFireC2SPacket(this.getUuid(), true));
                baseWeapon.onStartFire(stack, world, this);
            } else {
                this.getNetworkChannel().send(new PlayerFireC2SPacket(this.getUuid(), false));
                baseWeapon.onEndFire(stack, world, this);
            }
            this.wasActive = active;
        }
        if (active && baseWeapon.canFire(stack)) {
            baseWeapon.tryFire(stack, world, this);
        }

        for (const [w, stack] of this.weapons) {
            if (w instanceof SpecialWeapon) {
                if (WorldConfig.devMode && w.getCooldown(stack) > 0.5) {
                    w.setCooldown(stack, 0.5);
                }
                if (w.canFire(stack) && this.input.wasPressed(w.bindKey())) {
                    w.tryFire(stack, world, this);
                    this.getNetworkChannel().send(new PlayerInputC2SPacket(this.getUuid(), w.bindKey()));
                }
            }
            w.inventoryTick(stack, world, this, 0, true);
        }
    }

    public getRevision(): number {
        return this.revision;
    }

    public updateSlotStacks(revision: number, stacks: Iterable<ItemStack>) {
        for (const itemStack of stacks) {
            const item = itemStack.getItem();
            const playerItemStack = this.weapons.get(item);
            if (playerItemStack) {
                playerItemStack.applyChanges(itemStack.getComponents().getChanges());
            } else {
                this.weapons.set(item, itemStack);
            }
        }

        this.revision = revision;
    }

    public override switchWeapon(dir: number = 1) {
        super.switchWeapon(dir);
        this.getNetworkChannel().send(new PlayerSwitchSlotC2SPacket(this.getUuid(), this.currentBaseIndex));
    }

    public override setScore(score: number) {
        super.setScore(score);
        (this.techTree as ClientTechTree).playerScore.textContent = `点数: ${this.getScore()}`;
    }

    public override canMoveVoluntarily(): boolean {
        return true;
    }
}