import type {UIOptions, WeaponUIInfo} from "../apis/IUIInfo.ts";
import {Game} from "../Game.ts";
import type {Weapon} from "../weapon/Weapon.ts";

export class UI {
    private readonly game: Game;
    private readonly font: string;
    private readonly hudColor: string;
    private readonly pauseHint: string;
    private readonly getWeaponUI: (weapon: any, key: string) => WeaponUIInfo | null;

    // HUD 布局参数
    private readonly marginX = 20;
    private readonly marginY = 20;
    private readonly lineGap = 8;
    private readonly barWidth = 140;
    private readonly barHeight = 10;

    constructor(game: Game, opts: UIOptions = {}) {
        this.game = game;
        this.font = opts.font ?? "14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        this.hudColor = opts.hudColor ?? "#ffffff";
        this.pauseHint = opts.pauseHint ?? "按 P 继续";
        this.getWeaponUI = opts.getWeaponUI ?? this.defaultWeaponAdapter;
    }

    private defaultWeaponAdapter(weapon: Weapon, key: string): WeaponUIInfo | null {
        const cd = weapon.getCooldown ?? 0;
        const max = weapon.getMaxCooldown ?? 1;
        const label = weapon.displayName ?? key.toUpperCase();
        const color = weapon.uiColor ?? "#5ec8ff";
        if (max <= 0) return null;
        return {label, color, cooldown: Math.max(0, cd), maxCooldown: Math.max(0.001, max)};
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (this.game.over) {
            UI.renderEndOverlay(ctx);
            return;
        }

        const player = this.game.player;
        if (!player) return;

        ctx.save();
        ctx.font = this.font;
        ctx.textBaseline = "top";
        ctx.fillStyle = this.hudColor;

        let x = this.marginX;
        let y = this.marginY;
        const uo = this.game.camera.uiOffset;

        ctx.translate(uo.x, uo.y);
        ctx.fillText(`分数: ${player.score}`, x, y);
        y += 20;
        ctx.fillText(`生命: ${player.getHealth} / ${player.getMaxHealth}`, x, y);
        y += 20;
        if (player.invincible) {
            ctx.fillText('已启用dev模式,将不再记录成绩', x, y);
            y += 20;
        }

        // 武器冷却条
        y += 4;

        const items: WeaponUIInfo[] = [];
        if (player.weapons) {
            for (const [key, w] of player.weapons) {
                if (w.getMaxCooldown === 0) continue;
                const info = this.getWeaponUI(w, key);
                if (info) items.push(info);
            }
        }

        for (const info of items) {
            this.drawCooldownBar(ctx, x, y, this.barWidth, this.barHeight, info);
            y += this.barHeight + this.lineGap;
        }

        ctx.restore();

        if (!this.game.ticking) {
            this.renderPauseOverlay(ctx);
        }
    }

    private drawCooldownBar(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        info: WeaponUIInfo
    ) {
        const ratio = Math.max(0, Math.min(1, 1 - info.cooldown / info.maxCooldown));

        // 背景槽
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));

        // 进度
        ctx.fillStyle = info.color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w * ratio), Math.floor(h));

        // 文本标签
        ctx.fillStyle = this.hudColor;
        ctx.fillText(info.label, Math.floor(x + w + 8), Math.floor(y - 1));
    }

    private renderPauseOverlay(ctx: CanvasRenderingContext2D) {
        const width = Game.W;
        const height = Game.H;

        // 半透明遮罩
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, width, height);

        // 轻微脉冲
        const t = Date.now() * 0.002;
        const pulse = 0.75 + 0.25 * Math.sin(t);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 主标题
        ctx.fillStyle = `rgba(255,255,255,${pulse.toFixed(3)})`;
        ctx.font = "bold 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText("已暂停", width / 2, height / 2);

        // 副提示
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(this.pauseHint, width / 2, height / 2 + 30);

        ctx.restore();
    }

    private static renderEndOverlay(ctx: CanvasRenderingContext2D) {
        const width = Game.W;
        const height = Game.H;

        ctx.save();
        ctx.fillStyle = "rgba(255,0,0,0.3)";
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = 'rgb(255,255,255)';
        ctx.font = "bold 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText("游戏结束", width / 2, height / 2);

        ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText("按 Enter 键重新开始", width / 2, height / 2 + 30);

        ctx.restore();
    }
}
