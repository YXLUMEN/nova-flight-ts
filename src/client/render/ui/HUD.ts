import {clamp, PI2} from "../../../utils/math/math.ts";
import type {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import type {ItemStack} from "../../../item/ItemStack.ts";
import type {IUi} from "./IUi.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientWorld} from "../../ClientWorld.ts";
import type {SpecialWeapon} from "../../../item/weapon/SpecialWeapon.ts";
import type {ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";
import {InventoryRender} from "../../inventory/InventoryRender.ts";
import {Weapon} from "../../../item/weapon/Weapon.ts";
import {Crosshair} from "./Crosshair.ts";

export class HUD implements IUi {
    private readonly font: string = '14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    private readonly hudColor: string = '#fff';

    private player: ClientPlayerEntity | null = null;
    private inventoryRender: InventoryRender | null = null;

    private readonly crosshair: Crosshair = new Crosshair();

    // HUD 布局参数
    private worldW: number = 0;
    private worldH: number = 0;
    private readonly marginX = 20;
    private readonly marginY = 20;
    private readonly lineGap = 8;
    private readonly barWidth = 140;
    private readonly barHeight = 10;
    private displayHealth: number = 0;

    public setSize(w: number, h: number) {
        this.worldW = w;
        this.worldH = h;
        this.inventoryRender?.setSize(w, h);
    }

    public setPlayer(player: ClientPlayerEntity | null): void {
        this.player = player;
        if (player) {
            this.inventoryRender = new InventoryRender(player);
            this.inventoryRender.setSize(this.worldW, this.worldH);
        } else {
            this.inventoryRender?.destroy();
            this.inventoryRender = null;
        }
    }

    public tick(tickDelta: number) {
        if (!this.player) return;

        const realHealth = this.player.getHealth();
        const speed = tickDelta * Math.max(this.displayHealth - realHealth, 4);
        if (this.displayHealth > realHealth) {
            this.displayHealth = Math.max(realHealth, this.displayHealth - speed);
        } else {
            this.displayHealth = realHealth;
        }

        this.crosshair.tick(this.player);
        this.inventoryRender!.tick();
    }

    public render(ctx: CanvasRenderingContext2D): void {
        const client = NovaFlightClient.getInstance();
        const world = client.world;
        if (!world) return;

        if (world.isOver) {
            this.renderEndOverlay(ctx, world);
            return;
        }

        if (!this.player) return;

        ctx.save();
        ctx.font = this.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.hudColor;

        let x = this.marginX;
        let y = this.marginY;
        const uo = client.window.camera.uiOffset;

        ctx.translate(uo.x, uo.y);
        ctx.fillText(`分数: ${this.player.getScore()}`, x, y);
        y += 20;

        if (this.player.isDevMode()) {
            ctx.fillText('已启用dev模式,将不再记录成绩', x, y);
            y += 20;
        }
        y += 4;

        this.renderHealth(ctx, this.player, x, y);
        y += this.barHeight + this.lineGap;

        // 武器冷却条
        const items = this.player.getActiveSpecials();
        if (items.length > 0) {
            const quickFire = this.player.getQuickFire();
            for (const item of items) {
                const stack = this.player.getItem(item);
                if (!stack) continue;

                if (item.getMaxCooldown(stack) <= 0) continue;

                this.drawBar(ctx, x, y, this.barWidth, this.barHeight, item, stack);
                if (item === quickFire) {
                    ctx.strokeStyle = "yellow";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x - 2, y - 2, this.barWidth + 4, this.barHeight + 4);
                }

                y += this.barHeight + this.lineGap;
            }
        }

        ctx.restore();

        if (this.player.approachMissile.size > 0) {
            this.renderLockAlert(ctx, 2);
        } else if (this.player.lockedMissile.size > 0) {
            this.renderLockAlert(ctx);
        }
        this.inventoryRender!.render(ctx);
    }

    private renderHealth(ctx: CanvasRenderingContext2D, player: PlayerEntity, x: number, y: number) {
        // 生命值
        const maxHealth = player.getMaxHealth();
        const realRatio = clamp(player.getHealth() / maxHealth, 0, 1);
        const displayRatio = clamp(this.displayHealth / maxHealth, 0, 1);

        const shieldAmount = player.getShieldAmount();
        const maxShield = player.getMaxShield();
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

    public renderMainWeapon(ctx: CanvasRenderingContext2D, tickDelta: number) {
        if (!this.player) return;

        const pos = this.player.getLerpPos(tickDelta);

        const stack = this.player.getCurrentItem();
        const item = stack.getItem();

        if (stack.isEmpty() || !(item instanceof Weapon)) return;
        this.crosshair.update(this.player, stack, item, tickDelta);

        const anchorX = Math.floor(pos.x + this.player.getDimensions().halfWidth + 12);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = this.font;

        ctx.fillStyle = item.getUiColor(stack) ?? '#fff';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(anchorX, pos.y, (64 * this.crosshair.displayRatio) | 0, 2);

        ctx.fillStyle = this.hudColor;
        const name = item.getDisplayName();
        ctx.fillText(name, anchorX, pos.y - 16);

        const textWidth = ctx.measureText(name).width + anchorX + 8;

        if (stack.isDamageable()) {
            const currentAmmo = stack.getDurability();
            const maxAmmo = stack.getMaxDurability();
            if (currentAmmo / maxAmmo <= 0.2) ctx.fillStyle = '#ff0000';
            ctx.fillText(`${currentAmmo}/${maxAmmo}`, textWidth, pos.y - 16);
        } else {
            ctx.fillText('\u221e', textWidth, pos.y - 16);
        }

        ctx.restore();
    }

    private drawBar(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        item: SpecialWeapon,
        stack: ItemStack
    ) {
        const ratio = clamp(1 - item.getCooldown(stack) / item.getMaxCooldown(stack), 0, 1);
        // 背景槽
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x | 0, y | 0, w | 0, h | 0);

        // 进度
        ctx.fillStyle = item.getUiColor(stack);
        ctx.fillRect(x | 0, y | 0, (w * ratio) | 0, h | 0);

        // 文本标签
        ctx.fillStyle = this.hudColor;
        ctx.fillText(item.getName().toString(), (x + w + 8) | 0, (y | 0) - 1);
    }

    private renderEndOverlay(ctx: CanvasRenderingContext2D, world: ClientWorld) {
        const width = this.worldW;
        const height = this.worldH;
        let y = height / 2 - 64;

        const time = world.getTime() | 0;
        const score = NovaFlightClient.getInstance().world?.getTotalScore() ?? 0;

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

    public renderPointer(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        this.crosshair.render(ctx, client);
    }

    public destroy() {
    }
}
