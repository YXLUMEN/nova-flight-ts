import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {KeyboardInput} from "../../input/KeyboardInput.ts";
import {ClientTechTree} from "../../tech/ClientTechTree.ts";
import {DataLoader} from "../../DataLoader.ts";
import type {World} from "../../world/World.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import type {AutoAim} from "../../tech/AutoAim.ts";
import type {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/PlayerMoveC2SPacket.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class ClientPlayerEntity extends PlayerEntity {
    public readonly input: KeyboardInput;

    private autoAimEnable: boolean = false;
    public autoAim: AutoAim | null = null;
    public steeringGear: boolean = false;

    public lockedMissile = new Set<MissileEntity>();
    public missilePos: { x: number, y: number, angle: number }[] = [];

    public constructor(world: World, input: KeyboardInput) {
        super(world);

        this.input = input;
        const viewport = document.getElementById('viewport') as HTMLElement;
        this.techTree = new ClientTechTree(viewport, DataLoader.get('tech-data'));
    }

    public override tick() {
        super.tick();

        const world = this.getWorld();
        const posRef = this.getPositionRef;

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
            this.getNetworkHandler().send(new PlayerMoveC2SPacket(new Vec2(dx, dy)));
        }

        if (this.autoAimEnable && this.autoAim) {
            this.autoAim.tick();
        } else if (this.steeringGear) {
            const pointer = this.input.getPointer;
            this.setClampYaw(Math.atan2(
                pointer.y - posRef.y,
                pointer.x - posRef.x
            ), 0.157075);
        }

        // 锁定
        this.missilePos.length = 0;
        if (this.lockedMissile.size > 0) {
            for (const missile of this.lockedMissile) {
                const dx = missile.getPositionRef.x - posRef.x;
                const dy = missile.getPositionRef.y - posRef.y;
                const angle = Math.atan2(dy, dx);
                const arrowX = posRef.x + Math.cos(angle) * 64;
                const arrowY = posRef.y + Math.sin(angle) * 64;
                this.missilePos.push({x: arrowX, y: arrowY, angle});
            }
        }

        if (this.input.wasPressed('KeyR')) {
            this.switchWeapon();
            return;
        }

        this.handlerFire(world);
    }

    protected handlerFire(world: World) {
        const baseWeapon = this.baseWeapons[this.currentBaseIndex];
        const stack = this.weapons.get(baseWeapon)!;
        const fire = this.input.isDown("Space") || WorldConfig.autoShoot;
        const active = stack.isAvailable() && fire;

        if (active !== this.wasActive) {
            if (!this.wasActive) {
                baseWeapon.onStartFire(world, stack);
            } else {
                baseWeapon.onEndFire(world, stack);
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
                }
            }
            w.inventoryTick(stack, world, this, 0, true);
        }
    }

    public override setScore(score: number) {
        super.setScore(score);
        (this.techTree as ClientTechTree).playerScore.textContent = `点数: ${this.getScore()}`;
    }
}