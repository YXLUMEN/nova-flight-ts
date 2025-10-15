import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ServerTechTree} from "../../tech/ServerTechTree.ts";
import type {World} from "../../world/World.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";


export class ServerPlayerEntity extends PlayerEntity {
    private readonly inputKeys = new Set<string>();

    public constructor(world: ServerWorld) {
        super(world);

        this.techTree = new ServerTechTree();
    }

    public override tick() {
        super.tick();
        if (this.wasActive) this.handleFire();
        this.inputKeys.clear();
    }

    public setFiring(bl: boolean) {
        this.wasActive = bl;
    }

    public handleFire() {
        const baseWeapon = this.baseWeapons[this.currentBaseIndex];
        const stack = this.weapons.get(baseWeapon)!;
        if (baseWeapon.canFire(stack)) {
            baseWeapon.tryFire(stack, this.getWorld(), this);
        }
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

    protected override tickInventory(world: World) {
        for (const [w, stack] of this.weapons) {
            if (w instanceof SpecialWeapon) {
                if (WorldConfig.devMode && w.getCooldown(stack) > 0.5) {
                    w.setCooldown(stack, 0.5);
                }
                if (w.canFire(stack) && this.inputKeys.delete(w.bindKey())) {
                    w.tryFire(stack, world, this);
                }
            }
            w.inventoryTick(stack, world, this, 0, true);
        }
    }
}