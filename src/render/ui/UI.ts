import type {UIOptions, WeaponUIInfo} from '../../apis/IUIInfo.ts';
import {World} from '../../world/World.ts';
import type {Weapon} from '../../item/weapon/Weapon.ts';
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {clamp} from "../../utils/math/math.ts";
import type {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {ItemStack} from "../../item/ItemStack.ts";

export class UI {
    private readonly world: World;
    private readonly font: string;
    private readonly hudColor: string;
    private readonly getWeaponUI: (stack: ItemStack) => WeaponUIInfo | null;

    // HUD 布局参数
    private readonly marginX = 20;
    private readonly marginY = 20;
    private readonly lineGap = 8;
    private readonly barWidth = 140;
    private readonly barHeight = 10;
    private displayHealth: number = 0;

    public constructor(world: World, opts: UIOptions = {}) {
        this.world = world;
        this.font = opts.font ?? '14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        this.hudColor = opts.hudColor ?? '#ffffff';
        this.getWeaponUI = opts.getWeaponUI ?? this.defaultWeaponAdapter;
    }

    public tick(tickDelta: number) {
        const player = this.world.player;
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
        if (this.world.isOver) {
            UI.renderEndOverlay(ctx);
            return;
        }

        const player = this.world.player;
        if (!player) return;

        ctx.save();
        ctx.font = this.font;
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.hudColor;

        let x = this.marginX;
        let y = this.marginY;
        const uo = this.world.camera.uiOffset;

        ctx.translate(uo.x, uo.y);
        ctx.fillText(`分数: ${player.getPhaseScore()}`, x, y);
        y += 20;

        if (WorldConfig.devMode) {
            ctx.fillText('已启用dev模式,将不再记录成绩', x, y);
            y += 20;
        }
        y += 4;

        this.renderHealth(ctx, player, x, y);
        y += this.barHeight + this.lineGap;

        // 武器冷却条
        if (player.weapons.size > 0) {
            for (const stack of player.weapons.values()) {
                const info = this.getWeaponUI(stack);
                if (info) {
                    this.drawBar(ctx, x, y, this.barWidth, this.barHeight, info);
                    y += this.barHeight + this.lineGap;
                }
            }
        }

        ctx.restore();

        this.drawPrimaryWeapons(ctx);

        if (!this.world.isTicking) {
            UI.renderPauseOverlay(ctx);
        }
    }

    private renderHealth(ctx: CanvasRenderingContext2D, player: PlayerEntity, x: number, y: number) {
        // 生命值
        const maxHealth = player.getMaxHealth();
        const realRatio = clamp(player.getHealth() / maxHealth, 0, 1);
        const displayRatio = clamp(this.displayHealth / maxHealth, 0, 1);

        // 背景
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x | 0, y | 0, this.barWidth | 0, this.barHeight | 0);

        // 白色缓冲条
        ctx.fillStyle = 'white';
        ctx.fillRect(x | 0, y | 0, (this.barWidth * displayRatio) | 0, this.barHeight | 0);

        // 红色当前血条
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x | 0, y | 0, (this.barWidth * realRatio) | 0, this.barHeight | 0);

        // 文字
        ctx.fillStyle = this.hudColor;
        ctx.fillText('船体值', (x + this.barWidth + 8) | 0, (y | 0) - 1);
    }

    private defaultWeaponAdapter(stack: ItemStack): WeaponUIInfo | null {
        const weapon = stack.getItem() as Weapon;
        const cd = weapon.getCooldown(stack) ?? 0;
        const max = weapon.getMaxCooldown(stack) ?? 1;
        const label = weapon.getDisplayName() ?? weapon.getDisplayName().toUpperCase();
        const color = weapon.getUiColor(stack) ?? '#5ec8ff';

        if (max <= 0 || weapon instanceof BaseWeapon) return null;
        return {label, color, cooldown: Math.max(0, cd), maxCooldown: Math.max(0.001, max)};
    }

    private drawPrimaryWeapons(ctx: CanvasRenderingContext2D) {
        const player = this.world.player;
        if (!player) return;

        const cam = this.world.camera.viewOffset;
        const px = player.getPositionRef.x - cam.x;
        const py = player.getPositionRef.y - cam.y;

        const stack = player.getCurrentItemStack();
        const weapon = stack.getItem() as BaseWeapon;

        const anchorX = Math.floor(px + player.getEntityDimension().width / 2 + 12);
        const ratio = Math.max(0, Math.min(1, 1 - weapon.getCooldown(stack) / weapon.getMaxCooldown(stack)));

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = this.font;

        ctx.fillStyle = weapon.getUiColor(stack) ?? '#5ec8ff';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(anchorX, py, (64 * ratio) | 0, 2);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.hudColor;
        ctx.fillText(weapon.getDisplayName(), anchorX, py - 16);

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

    private static renderPauseOverlay(ctx: CanvasRenderingContext2D) {
        const width = World.W / 2;
        const height = World.H / 2;

        // 半透明遮罩
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, World.W, World.H);

        // 轻微脉冲
        const t = Date.now() * 0.002;
        const pulse = 0.75 + 0.25 * Math.sin(t);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 主标题
        ctx.fillStyle = `rgba(255,255,255,${pulse.toFixed(3)})`;
        ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText('已暂停', width, height);

        // 副提示
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText('按 Esc 继续', width, height + 30);

        ctx.restore();
    }

    private static renderEndOverlay(ctx: CanvasRenderingContext2D) {
        const width = World.W;
        const height = World.H;
        let y = height / 2 - 64;

        const world = World.instance;
        const time = world.getTime() | 0;
        const score = world.player?.getPhaseScore() ?? 0;

        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText('游戏结束', width / 2, y);
        y += 48;

        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(`游戏时长: ${time}, 得分: ${score}, 击杀效率: ${(score / time).toFixed(2)}`, width / 2, y);
        y += 32;

        ctx.fillText('按 Enter 键重新开始', width / 2, y);

        ctx.restore();
    }
}
