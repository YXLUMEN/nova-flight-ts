import type {WeaponUIInfo} from '../../../apis/IUIInfo.ts';
import type {Weapon} from '../../../item/weapon/Weapon.ts';
import {BaseWeapon} from "../../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {clamp, lerp, PI2} from "../../../utils/math/math.ts";
import type {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import type {ItemStack} from "../../../item/ItemStack.ts";
import type {IUi} from "./IUi.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientWorld} from "../../ClientWorld.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";

export class HUD implements IUi {
    private readonly font: string = '14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    private readonly hudColor: string = '#fff';

    // HUD 布局参数
    private worldW: number = 0;
    private worldH: number = 0;
    private readonly marginX = 20;
    private readonly marginY = 20;
    private readonly lineGap = 8;
    private readonly barWidth = 140;
    private readonly barHeight = 10;
    private displayHealth: number = 0;
    private displayRatio: number = 0;

    public setSize(w: number, h: number) {
        this.worldW = w;
        this.worldH = h;
    }

    public tick(tickDelta: number) {
        const player = NovaFlightClient.getInstance().player;
        if (!player) return;

        const realHealth = player.getHealth();
        const speed = tickDelta * Math.max(this.displayHealth - realHealth, 4);
        if (this.displayHealth > realHealth) {
            this.displayHealth = Math.max(realHealth, this.displayHealth - speed);
        } else {
            this.displayHealth = realHealth;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        const world = NovaFlightClient.getInstance().world;
        if (!world) return;

        if (world.isOver) {
            this.renderEndOverlay(ctx, world);
            return;
        }

        const player = NovaFlightClient.getInstance().player;
        if (!player) return;

        ctx.save();
        ctx.font = this.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.hudColor;

        let x = this.marginX;
        let y = this.marginY;
        const uo = NovaFlightClient.getInstance().window.camera.uiOffset;

        ctx.translate(uo.x, uo.y);
        ctx.fillText(`分数: ${player.getScore()}`, x, y);
        y += 20;

        if (player.isDevMode()) {
            ctx.fillText('已启用dev模式,将不再记录成绩', x, y);
            y += 20;
        }
        y += 4;

        this.renderHealth(ctx, player, x, y);
        y += this.barHeight + this.lineGap;

        // 武器冷却条
        const items = player.getInventory();
        if (items.size > 0) {
            const quickFire = player.getQuickFire();
            for (const stack of items.values()) {
                const info = this.getWeaponUI(stack);
                if (!info) continue;

                this.drawBar(ctx, x, y, this.barWidth, this.barHeight, info);
                if (stack.getItem() === quickFire) {
                    ctx.strokeStyle = "yellow";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x - 2, y - 2, this.barWidth + 4, this.barHeight + 4);
                }

                y += this.barHeight + this.lineGap;
            }
        }

        ctx.restore();

        if (player.approachMissile.size > 0) {
            this.renderLockAlert(ctx, 2);
        } else if (player.lockedMissile.size > 0) {
            this.renderLockAlert(ctx);
        }
    }

    private renderHealth(ctx: CanvasRenderingContext2D, player: PlayerEntity, x: number, y: number) {
        // 生命值
        const maxHealth = player.getMaxHealth();
        const realRatio = clamp(player.getHealth() / maxHealth, 0, 1);
        const displayRatio = clamp(this.displayHealth / maxHealth, 0, 1);

        const shieldAmount = player.getShieldAmount();
        const maxShield = player.getMaxShieldAmount();
        const shieldRatio = maxShield > 0 ? clamp(shieldAmount / maxShield, 0, 1) : 0;

        // 背景
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x | 0, y | 0, this.barWidth | 0, this.barHeight | 0);

        // 白色缓冲条
        ctx.fillStyle = '#fff';
        ctx.fillRect(x | 0, y | 0, (this.barWidth * displayRatio) | 0, this.barHeight | 0);

        // 红色当前血条
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x | 0, y | 0, (this.barWidth * realRatio) | 0, this.barHeight | 0);

        // 护盾
        if (shieldRatio > 0) {
            const shieldWidth = (this.barWidth * shieldRatio) | 0;

            ctx.fillStyle = 'rgba(80,149,255,0.8)';
            ctx.fillRect(x | 0, y | 0, shieldWidth, this.barHeight | 0);
        }

        // 文字
        ctx.fillStyle = this.hudColor;
        ctx.fillText('船体值', (x + this.barWidth + 8) | 0, (y | 0) - 1);
    }

    private getWeaponUI(stack: ItemStack): WeaponUIInfo | null {
        const weapon = stack.getItem() as Weapon;
        const cd = weapon.getCooldown(stack) ?? 0;
        const max = weapon.getMaxCooldown(stack) ?? 1;
        const label = weapon.getDisplayName() ?? weapon.getDisplayName().toUpperCase();
        const color = weapon.getUiColor(stack) ?? '#5ec8ff';

        if (max <= 0 || weapon instanceof BaseWeapon) return null;
        return {label, color, cooldown: Math.max(0, cd), maxCooldown: Math.max(0.001, max)};
    }

    public drawPrimaryWeapons(ctx: CanvasRenderingContext2D, tickDelta: number) {
        const player = NovaFlightClient.getInstance().player;
        if (!player) return;

        const pos = player.getLerpPos(tickDelta);

        const stack = player.getCurrentItemStack();
        if (!stack) return;
        const weapon = stack.getItem() as BaseWeapon;

        let ratio: number;
        const reloadLeft = player.cooldownManager.getCooldownTicks(weapon);
        if (reloadLeft > 0) {
            ratio = clamp(1 - reloadLeft / stack.getOrDefault(DataComponentTypes.MAX_RELOAD_TIME, 1), 0, 1);
        } else {
            ratio = clamp(1 - weapon.getCooldown(stack) / weapon.getMaxCooldown(stack), 0, 1);
        }
        this.displayRatio = lerp(tickDelta, this.displayRatio, ratio);
        const anchorX = Math.floor(pos.x + player.getWidth() / 2 + 12);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = this.font;

        ctx.fillStyle = weapon.getUiColor(stack) ?? '#5ec8ff';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(anchorX, pos.y, (64 * this.displayRatio) | 0, 2);

        ctx.fillStyle = this.hudColor;
        const name = weapon.getDisplayName();
        ctx.fillText(name, anchorX, pos.y - 16);

        const textWidth = ctx.measureText(name).width + anchorX + 8;

        if (stack.isDamageable()) {
            const currentAmmo = stack.getDurability();
            const maxAmmo = stack.getMaxDurability();
            if (currentAmmo / maxAmmo <= 0.2) ctx.fillStyle = '#ff0000';
            ctx.fillText(`${currentAmmo}/${maxAmmo}`, textWidth, pos.y - 16);
        } else {
            ctx.fillText('∞', textWidth, pos.y - 16);
        }

        ctx.restore();
    }

    private drawBar(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        info: WeaponUIInfo
    ) {
        const ratio = clamp(1 - info.cooldown / info.maxCooldown, 0, 1);
        // 背景槽
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x | 0, y | 0, w | 0, h | 0);

        // 进度
        ctx.fillStyle = info.color;
        ctx.fillRect(x | 0, y | 0, (w * ratio) | 0, h | 0);

        // 文本标签
        ctx.fillStyle = this.hudColor;
        ctx.fillText(info.label, (x + w + 8) | 0, (y | 0) - 1);
    }

    private renderEndOverlay(ctx: CanvasRenderingContext2D, world: ClientWorld) {
        const width = this.worldW;
        const height = this.worldH;
        let y = height / 2 - 64;

        const time = world.getTime() | 0;
        const score = NovaFlightClient.getInstance().player?.getScore() ?? 0;

        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.font = 'bold 32px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        ctx.fillText('游戏结束', width / 2, y);
        y += 48;

        ctx.font = '16px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        ctx.fillText(`游戏时长: ${time}, 得分: ${score}, 击杀效率: ${(score / time).toFixed(2)}`, width / 2, y);
        y += 32;

        ctx.fillText('按 任意键 返回标题页面', width / 2, y);

        ctx.restore();
    }

    public renderLockAlert(ctx: CanvasRenderingContext2D, flag = 1) {
        const x = (this.worldW - 120) / 2;
        const y = this.worldH - 60;

        const t = performance.now() * 0.01;
        const pulse = (Math.sin(t * PI2) + 1) / 2;
        const borderAlpha = 0.35 + 0.45 * pulse;
        const fillAlpha = 0.6;

        ctx.save();

        // 背景板
        ctx.fillStyle = `rgba(10,10,12,${fillAlpha})`;
        ctx.shadowColor = `rgba(255,70,70,${borderAlpha})`;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.rect(x, y, 120, 32);
        ctx.closePath();
        ctx.fill();

        // 外边框
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255,80,80,${borderAlpha})`;
        ctx.stroke();

        // 文案
        ctx.font = `bold 14px ui-monospace, Menlo, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.shadowColor = 'rgba(255,60,60,0.4)';
        if (flag === 0) {
            ctx.fillText('敌锁定', x + 60, y + 16);
        } else if (flag === 1) {
            ctx.fillText('敌导弹', x + 60, y + 16);
        } else if (flag === 2) {
            ctx.fillText('即将到达', x + 60, y + 16);
        }

        ctx.restore();
    }

    public destroy() {
    }
}
