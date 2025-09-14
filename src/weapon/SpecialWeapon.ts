import {Weapon} from "./Weapon.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";

export abstract class SpecialWeapon extends Weapon {
    public override tick() {
        const cooldown = this.getCooldown();
        if (cooldown === 0) return;
        if (this.shouldCooldown()) this.setCooldown(cooldown - 1);
        if (this.isReady()) this.onReady();
    }

    public isReady(): boolean {
        return this.getCooldown() === 0;
    }

    public onReady(): void {
        SoundSystem.playSound(SoundEvents.WEAPON_READY);
    }

    public abstract bindKey(): string;
}