import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ServerTechTree} from "../../tech/ServerTechTree.ts";
import type {Tech} from "../../apis/ITech.ts";

export class ServerPlayerEntity extends PlayerEntity {
    public constructor(world: ServerWorld, tech: Tech[]) {
        super(world);

        this.techTree = new ServerTechTree(tech);
    }

    public override tick() {
        super.tick();
        if (this.wasActive) this.handleFire();
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
        }
    }
}