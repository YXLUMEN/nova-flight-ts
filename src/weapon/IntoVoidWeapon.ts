import {Weapon} from "./Weapon.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {type Entity} from "../entity/Entity.ts";
import {World} from "../World.ts";
import {WindowOverlay} from "../effect/WindowOverlay.ts";

export class IntoVoidWeapon extends Weapon implements ISpecialWeapon {
    public static readonly displayName = "遁入虚空";
    public static readonly uiColor = "#7945ff";

    private readonly duration = 5;

    private active = false;
    private timeLeft = 0;
    private prevInvincible = false;

    private mask: WindowOverlay | null = null;

    public constructor(owner: Entity) {
        super(owner, 0, 30);
    }

    public override tryFire(world: World): void {
        if (this.active || this.getCooldown() > 0) return;

        this.active = true;
        this.timeLeft = this.duration;

        // 只覆盖本次之前的无敌, 退出时恢复
        this.prevInvincible = world.player.invincible;
        world.player.invincible = true;

        this.mask = new WindowOverlay({
            color: IntoVoidWeapon.uiColor,
            maxAlpha: 0.28,
            fadeIn: 0.2,
            fadeOut: 0.4,
            composite: "screen",
        });
        world.addEffect(this.mask);
    }

    public override update(dt: number): void {
        if (this.getCooldown() > 0) this.setCooldown(Math.max(0, this.getCooldown() - dt));
        if (!this.active) return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.exitVoid(World.instance);
        }
    }

    private exitVoid(world: World, keepCooldown = true): void {
        this.active = false;
        this.timeLeft = 0;
        this.setCooldown(this.getMaxCooldown());

        // 恢复之前的无敌状态,不覆盖其他来源
        world.player.invincible = this.prevInvincible;
        this.prevInvincible = false;

        if (this.mask) {
            this.mask.end();
            this.mask = null;
        }

        if (!keepCooldown) {
            const used = this.getMaxCooldown() - this.getCooldown();
            const refund = 0;
            this.setCooldown(Math.max(0, this.getMaxCooldown() - Math.max(used, refund)));
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

    public override getDisplayName(): string {
        return IntoVoidWeapon.displayName;
    }

    public override getUiColor(): string {
        return IntoVoidWeapon.uiColor;
    }
}