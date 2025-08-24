import {Weapon} from "./Weapon.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {World} from "../World.ts";
import {WindowOverlay} from "../effect/WindowOverlay.ts";
import {PlayerEntity} from "../entity/PlayerEntity.ts";
import {pointInCircleVec2} from "../math/math.ts";
import {EMPWeapon} from "./EMPWeapon.ts";
import {LaserWeapon} from "./LaserWeapon.ts";

export class IntoVoidWeapon extends Weapon implements ISpecialWeapon {
    public static readonly displayName = "遁入虚空";
    public static readonly uiColor = "#7945ff";

    public radius = 32;
    public duration = 5;
    private active = false;
    private timeLeft = 0;
    private prevInvincible = false;

    private mask: WindowOverlay | null = null;

    public constructor(owner: PlayerEntity) {
        super(owner, 0, 30);
    }

    public override tryFire(world: World): void {
        if (this.active) return;

        this.active = true;
        this.timeLeft = this.duration;

        if (this.owner instanceof PlayerEntity) {
            this.prevInvincible = this.owner.invulnerable;
            this.owner.invulnerable = true;

            this.mask = new WindowOverlay({
                color: IntoVoidWeapon.uiColor,
                maxAlpha: 0.28,
                fadeIn: 0.2,
                fadeOut: 0.4,
                composite: "screen",
            });
            world.addEffect(this.mask);

            if (this.owner.techTree.isUnlocked('void_energy_extraction')) {
                const emp = this.owner.weapons.get('emp');
                if (emp instanceof EMPWeapon) emp.setCooldown(0);
            }
        }
    }

    public override canFire(): boolean {
        return !this.active && this.getCooldown() <= 0;
    }

    public override update(dt: number): void {
        if (this.getCooldown() > 0) this.setCooldown(Math.max(0, this.getCooldown() - dt));
        if (!this.active) return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.exitVoid(this.owner.getWorld());
        }
        if (this.owner instanceof PlayerEntity && this.owner.techTree.isUnlocked('void_energy_extraction')) {
            const laser = this.owner.weapons.get('laser');
            if (laser instanceof LaserWeapon) laser.instantCooldown();
        }
    }

    private exitVoid(world: World, keepCooldown = true): void {
        this.active = false;
        this.timeLeft = 0;
        this.setCooldown(this.getMaxCooldown());

        if (this.mask) {
            this.mask.end();
            this.mask = null;
        }

        if (!keepCooldown) {
            const used = this.getMaxCooldown() - this.getCooldown();
            const refund = 0;
            this.setCooldown(Math.max(0, this.getMaxCooldown() - Math.max(used, refund)));
        }

        const owner = this.owner;
        if (!(owner instanceof PlayerEntity)) return;

        // 恢复之前的无敌状态,不覆盖其他来源
        world.player.invulnerable = this.prevInvincible;
        this.prevInvincible = false;

        const box = this.owner.boxRadius + this.radius;
        for (const mob of world.mobs) {
            if (mob.isDead() || !pointInCircleVec2(this.owner.pos, mob.pos, box + mob.boxRadius)) continue;
            mob.onDeath(world.getDamageSources().void(this.owner as PlayerEntity));
        }

        if (owner.techTree.isUnlocked('void_disturbance')) {
            const emp = owner.weapons.get('emp');
            if (emp) {
                const cd = emp.getCooldown();
                emp.tryFire(world);
                emp.setCooldown(cd);
            }
        }
    }

    public bindKey(): string {
        return "Digit4";
    }

    public override getCooldown(): number {
        return this.active ? (this.duration - this.timeLeft) : super.getCooldown();
    }

    public override getMaxCooldown(): number {
        return this.active ? this.duration : super.getMaxCooldown();
    }

    public trueMaxCooldown(): number {
        return super.getMaxCooldown();
    }

    public override getDisplayName(): string {
        return IntoVoidWeapon.displayName;
    }

    public override getUiColor(): string {
        return IntoVoidWeapon.uiColor;
    }
}