import {Weapon} from "./Weapon.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {World} from "../world/World.ts";
import {WindowOverlay} from "../effect/WindowOverlay.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {pointInCircleVec2} from "../utils/math/math.ts";
import {EMPWeapon} from "./EMPWeapon.ts";
import {LaserWeapon} from "./LaserWeapon.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {EntityAttributes} from "../entity/attribute/EntityAttributes.ts";
import {Identifier} from "../registry/Identifier.ts";

export class IntoVoidWeapon extends Weapon implements ISpecialWeapon {
    public static readonly displayName = "遁入虚空";
    public static readonly uiColor = "#7945ff";

    public readonly modifier = {id: Identifier.ofVanilla('weapon.into_void'), value: 0.4};
    public radius = 32;
    public duration = 250;
    private active = false;
    private timeLeft = 0;
    private prevInvincible = false;

    private mask: WindowOverlay | null = null;

    public constructor(owner: PlayerEntity) {
        super(owner, 0, 1500);
    }

    public override tryFire(world: World): void {
        if (this.active) return;

        this.active = true;
        this.timeLeft = this.duration;

        if (this.owner instanceof PlayerEntity) {
            this.prevInvincible = this.owner.invulnerable;
            this.owner.invulnerable = true;
            this.owner.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.addModifier(this.modifier);

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

    public override tick(): void {
        if (this.getCooldown() > 0) this.setCooldown(Math.max(0, this.getCooldown() - 1));
        if (!this.active) return;

        this.timeLeft -= 1;
        if (this.timeLeft <= 0) {
            this.exitVoid(this.owner.getWorld());
        }
        if (this.owner instanceof PlayerEntity && this.owner.techTree.isUnlocked('void_energy_extraction')) {
            const laser = this.owner.weapons.get('laser');
            if (laser instanceof LaserWeapon) laser.instantCooldown();
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

    private exitVoid(world: World, keepCooldown = true): void {
        this.owner.getAttributeInstance(EntityAttributes.GENERIC_MOVEMENT_SPEED)?.removeModifierById(this.modifier.id);
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

        world.player.invulnerable = this.prevInvincible;
        this.prevInvincible = false;

        const box = this.owner.getEntityWidth() + this.radius;
        for (const mob of world.getMobs()) {
            if (mob.isRemoved() || !pointInCircleVec2(this.owner.getMutPos, mob.getMutPos, box + mob.getEntityWidth())) continue;
            if (mob instanceof BossEntity) continue;
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
}