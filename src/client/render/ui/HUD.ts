import {clamp} from "../../../utils/math/math.ts";
import type {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import type {ItemStack} from "../../../item/ItemStack.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientWorld} from "../../ClientWorld.ts";
import type {SpecialWeapon} from "../../../item/weapon/SpecialWeapon.ts";
import type {ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";
import {InventoryRender} from "../../inventory/InventoryRender.ts";
import {Weapon} from "../../../item/weapon/Weapon.ts";
import {Crosshair} from "./Crosshair.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {UiFramework} from "./UiFramework.ts";
import {LockAlert} from "./LockAlert.ts";

export class HUD extends UiFramework {
    private readonly font: string = '14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    private readonly hudColor: string = '#fff';
    private readonly healthText = TranslatableText.of('hud.health');

    private readonly crosshair: Crosshair = new Crosshair();
    private readonly lockAlert: LockAlert = new LockAlert();

    private player: ClientPlayerEntity | null = null;
    private inventoryRender: InventoryRender | null = null;

    // HUD 布局参数
    private readonly marginX = 20;
    private readonly marginY = 20;
    private readonly lineGap = 8;
    private readonly barWidth = 140;
    private readonly barHeight = 10;
    private displayHealth: number = 0;

    public setSize(w: number, h: number) {
        super.setSize(w, h);
        this.lockAlert.setPos(this.halfW - 60, this.height - 60);
        this.inventoryRender?.setSize(w, h);
    }

    public setPlayer(player: ClientPlayerEntity | null): void {
        this.player = player;
        this.inventoryRender?.destroy();
        this.inventoryRender = null;

        if (player) {
            this.inventoryRender = new InventoryRender(player);
            this.inventoryRender.setSize(this.width, this.height);
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

        if (world.isOver()) {
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
            ctx.fillText('已启用开发者模式,将不再记录成绩', x, y);
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
            this.lockAlert.render(ctx, 2);
        } else if (this.player.lockedMissile.size > 0) {
            this.lockAlert.render(ctx, 1);
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
        ctx.fillRect(x, y, this.barWidth, this.barHeight);

        // 白色缓冲条
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, (this.barWidth * displayRatio) | 0, this.barHeight);

        // 红色当前血条
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, (this.barWidth * realRatio) | 0, this.barHeight);

        // 护盾
        if (shieldRatio > 0) {
            const shieldWidth = (this.barWidth * shieldRatio) | 0;

            ctx.fillStyle = 'rgba(80,149,255,0.8)';
            ctx.fillRect(x, y, shieldWidth, this.barHeight);
        }

        // 文字
        ctx.fillStyle = this.hudColor;
        ctx.fillText(this.healthText.toString(), x + this.barWidth + 8, y - 1);
    }

    public renderMainWeapon(ctx: CanvasRenderingContext2D, tickDelta: number) {
        if (!this.player) return;

        const stack = this.player.getCurrentItem();
        const item = stack.getItem();

        if (stack.isEmpty() || !(item instanceof Weapon)) return;
        this.crosshair.update(this.player, stack, item, tickDelta);

        const pos = this.player.getLerpPos(tickDelta);
        const anchorX = Math.floor(pos.x + this.player.getDimensions().halfWidth + 12);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = this.font;

        ctx.fillStyle = item.getUiColor(stack) ?? '#fff';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(anchorX, pos.y, (64 * this.crosshair.displayRatio) | 0, 2);

        ctx.fillStyle = this.hudColor;

        const name = item.getName().toString();
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
        ctx.fillRect(x, y, w, h);

        // 进度
        ctx.fillStyle = item.getUiColor(stack);
        ctx.fillRect(x, y, (w * ratio) | 0, h);

        // 文本标签
        ctx.fillStyle = this.hudColor;
        ctx.fillText(item.getName().toString(), x + w + 8, y - 1);
    }

    private renderEndOverlay(ctx: CanvasRenderingContext2D, world: ClientWorld) {
        const halfW = this.halfW;
        const height = this.height;
        let y = height / 2 - 64;

        const time = world.getTime() | 0;
        const score = NovaFlightClient.getInstance().world?.getTotalScore() ?? 0;

        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        ctx.fillRect(0, 0, this.width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.font = 'bold 32px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        ctx.fillText(TranslatableText.of('hud.game_over').toString(), halfW, y);
        y += 48;

        ctx.font = '16px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        const text = new TranslatableText('hud.summary', [
            time.toString(), score.toString(), (score / time).toFixed(2)]);
        ctx.fillText(text.toString(), halfW, y);
        y += 32;

        ctx.fillText(TranslatableText.of('hud.back').toString(), halfW, y);
        ctx.restore();
    }

    public renderPointer(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        this.crosshair.render(ctx, client);
    }

    public destroy() {
        this.player = null;
        this.inventoryRender?.destroy();
        this.inventoryRender = null;
    }
}
