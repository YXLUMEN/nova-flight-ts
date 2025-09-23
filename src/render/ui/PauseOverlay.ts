import {World} from "../../world/World.ts";
import type {IUi} from "./IUi.ts";
import {NovaFlightServer} from "../../server/NovaFlightServer.ts";

interface UIButton {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    onClick: () => void;
}

export class PauseOverlay implements IUi {
    private readonly world: World;
    private buttons: UIButton[] = [];
    private pulse = 1;

    private worldW: number = 0;
    private worldH: number = 0;

    public constructor(world: World) {
        this.world = world;
    }

    public setWorldSize(w: number, h: number) {
        this.worldW = w;
        this.worldH = h;
        this.layoutButtons();
    }

    private layoutButtons() {
        const centerX = this.worldW / 2;
        const centerY = this.worldH / 2;
        this.buttons.length = 0;
        this.buttons.push(
            {
                x: centerX - 60,
                y: centerY - 50,
                w: 120,
                h: 36,
                label: '继续游戏',
                onClick: () => this.world.togglePause()
            },
            {
                x: centerX - 60,
                y: centerY,
                w: 120,
                h: 36,
                label: '设置',
                onClick: () => {
                }
            },
            {
                x: centerX - 60,
                y: centerY + 50,
                w: 120,
                h: 36,
                label: '保存并退出',
                onClick: () => NovaFlightServer.stopGame()
            }
        );
    }

    public render(ctx: CanvasRenderingContext2D) {
        const width = this.worldW / 2;
        const height = this.worldH / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, this.worldW, this.worldH);

        // 脉冲
        const t = performance.now() * 0.002;
        this.pulse = 0.75 + 0.25 * Math.sin(t);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 主标题
        ctx.fillStyle = `rgba(255,255,255,${this.pulse.toFixed(3)})`;
        ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText('已暂停', width, height - 100);

        // 副提示
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText('按 Esc 继续', width, height - 70);

        // 按钮
        this.renderButtons(ctx);

        ctx.restore();
    }

    private renderButtons(ctx: CanvasRenderingContext2D) {
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const btn of this.buttons) {
            // 背景
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

            // 边框
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

            // 文本
            ctx.fillStyle = 'white';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
        }
    }

    public handleClick(mouseX: number, mouseY: number) {
        for (const btn of this.buttons) {
            if (
                mouseX >= btn.x &&
                mouseX <= btn.x + btn.w &&
                mouseY >= btn.y &&
                mouseY <= btn.y + btn.h
            ) {
                btn.onClick();
                return true;
            }
        }
        return false;
    }

    public destroy() {
        (this.world as any) = null;
        this.buttons.length = 0;
    }
}
