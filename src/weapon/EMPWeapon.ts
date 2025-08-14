import {Weapon} from "./Weapon.ts";
import {PlayerEntity} from "../entity/PlayerEntity.ts";
import {Game} from "../Game.ts";
import {SlowStatus} from "../status/SlowStatus.ts";

export class EMPWeapon extends Weapon {
    public readonly CD = 10;

    public override tryFire(game: Game, cd: boolean): void {
        if (this.getCooldown > 0) return;
        if (this.owner instanceof PlayerEntity && !this.owner.input.isDown("2")) return;

        EMPWeapon.applyEMPEffect(game);
        game.events.emit('emp-detonate', {
            pos: this.owner.pos.clone(),
        });
        this.cooldown = cd ? this.CD : 0.5;
    }

    public override get getMaxCooldown(): number {
        return this.CD;
    }

    public get displayName(): string {
        return 'EMP';
    }

    public get uiColor(): string {
        return '#5ec8ff'
    }

    public static applyEMPEffect(game: Game) {
        for (const mob of game.mobs) {
            if (!mob.isDead) mob.addStatus(new SlowStatus(6, 0.35));
        }
    }
}