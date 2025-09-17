import {BaseWeapon} from "./BaseWeapon.ts";
import type {ItemStack} from "../../ItemStack.ts";
import type {World} from "../../../world/World.ts";
import type {Entity} from "../../../entity/Entity.ts";

export class CannonShotShellWeapon extends BaseWeapon {
    getUiColor(_stack: ItemStack): string {
        return "";
    }

    tryFire(_stack: ItemStack, _world: World, _attacker: Entity): void {
    }
}