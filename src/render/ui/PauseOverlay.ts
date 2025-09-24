import {World} from "../../world/World.ts";
import type {IUi} from "./IUi.ts";
import {NovaFlightServer} from "../../server/NovaFlightServer.ts";
import {UIButton} from "./UIButton.ts";

export class PauseOverlay implements IUi {
    private readonly world: World;
    private buttons: UIButton[] = [];
    private pulse = 1;

    private worldW: number = 0;
    private worldH: number = 0;

    public constructor(world: World) {
        this.world = world;
    }

    public setSize(w: number, h: number) {
        this.worldW = w;
        this.worldH = h;
        this.layoutButtons();
    }

    private layoutButtons() {
        const centerX = this.worldW / 2;
        const centerY = this.worldH / 2;
        this.buttons.length = 0;
        this.buttons.push(
            new UIButton(
                centerX - 60, centerY - 50,
                120, 36,
                '继续游戏',
                () => this.world.togglePause()),
            new UIButton(
                centerX - 60, centerY,
                120, 36,
                '设置',
                () => {
                    this.world.getNotify().show('正在制作');
                }),
            new UIButton(
                centerX - 60, centerY + 50,
                120, 36,
                '保存并退出',
                () => NovaFlightServer.stopGame()),
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

        // 主标题
        ctx.fillStyle = `rgba(255,255,255,${this.pulse.toFixed(3)})`;
        ctx.font = 'bold 32px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        ctx.fillText('已暂停', width, height - 100);

        // 副提示
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '16px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        ctx.fillText('按 Esc 继续', width, height - 70);

        // 按钮
        for (const btn of this.buttons) {
            btn.render(ctx);
        }

        ctx.restore();
    }

    public handleClick(mouseX: number, mouseY: number) {
        for (const btn of this.buttons) {
            if (btn.hitTest(mouseX, mouseY)) {
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
