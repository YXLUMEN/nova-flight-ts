import {StarField} from "../../../effect/StarField.ts";
import {defaultLayers} from "../../../configs/StarfieldConfig.ts";
import {Camera} from "../Camera.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import type {IUi} from "./IUi.ts";
import {UIButton} from "./UIButton.ts";
import {UITheme} from "./theme.ts";
import {Window} from "../Window.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";

type StartScreenOptions = {
    title: string;
    subtitle: string;
};

export class StartScreen implements IUi {
    private readonly ctx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;

    private readonly tempCamera: Camera = new Camera();
    private readonly starField: StarField = new StarField(96, defaultLayers, 8);

    private ctrl = new AbortController();
    private running = false
    private options: Required<StartScreenOptions>;

    private tickInterval = 1000 / 50;
    private lastTickTime = 0;

    private readonly waitConfirm: Promise<number>;
    private readonly onConfirmCallback: (action: number) => void;

    private buttons: UIButton[] = [];
    private bindTick = this.tick.bind(this);

    public constructor(ctx: CanvasRenderingContext2D, options: StartScreenOptions) {
        const {promise, resolve} = Promise.withResolvers<number>();
        this.waitConfirm = promise;
        this.onConfirmCallback = resolve;

        this.ctx = ctx;
        this.options = {
            title: options.title,
            subtitle: options.subtitle
        };

        this.starField.init();
    }

    public start() {
        this.running = true;
        this.tempCamera.update(MutVec2.zero(), 0);
        this.tick(0);

        window.addEventListener('keydown', event => {
            if (event.code === 'Space' || event.code === 'Enter') {
                if (!document.getElementById('command-bar')?.classList.contains('hidden')) return;
                this.newGame();
            }
        }, {signal: this.ctrl.signal});

        window.addEventListener('click', (event) => {
            for (const btn of this.buttons) {
                if (btn.hitTest(event.offsetX, event.offsetY)) {
                    btn.onClick();
                }
            }
        }, {signal: this.ctrl.signal});

        window.addEventListener('resize', () => {
            NovaFlightClient.getInstance().window.resize();
            this.setSize(Window.VIEW_W, Window.VIEW_H);
        }, {signal: this.ctrl.signal});
    }

    public setSize(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.layoutButtons();
    }

    public tick(tickDelta: number) {
        if (!this.running) return;

        if (!this.lastTickTime) {
            this.lastTickTime = tickDelta;
        }

        let elapsed = tickDelta - this.lastTickTime;
        while (elapsed >= this.tickInterval) {
            this.starField.update(0.02, this.tempCamera);
            this.lastTickTime += this.tickInterval;
            elapsed -= this.tickInterval;
        }

        this.render(this.ctx);
        requestAnimationFrame(this.bindTick);
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, this.width, this.height);

        this.starField.render(ctx, this.tempCamera, 1);
        // 标题
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.options.title, this.width / 2, this.height / 2 - 100);

        // 副标题
        ctx.font = '24px sans-serif';
        ctx.fillText(this.options.subtitle, this.width / 2, this.height / 2 - 50);

        // 按钮
        ctx.font = UITheme.font;
        for (const btn of this.buttons) {
            btn.render(ctx);
        }
    }

    public destroy() {
        this.running = false;
        this.ctrl.abort();

        (this.ctx as any) = null;
        (this.starField as any) = null;
        (this.tempCamera as any) = null;
    }

    public onConfirm() {
        return this.waitConfirm;
    }

    private layoutButtons() {
        const startX = (this.width - 200) / 2;
        const startY = this.height / 2;

        this.buttons.length = 0;
        this.buttons.push(
            new UIButton(
                startX, startY,
                200, 50,
                '开始游戏',
                this.newGame.bind(this),
            ),
            new UIButton(
                startX, startY + 60,
                200, 50,
                '读取存档',
                this.readSave.bind(this),
            ),
            new UIButton(
                startX, startY + 120,
                200, 50,
                '加入游戏',
                this.joinGame.bind(this),
            ),
            new UIButton(
                startX, startY + 180,
                200, 50,
                '退出游戏',
                this.exitGame.bind(this),
            )
        );
    }

    private exitGame(): void {
        this.destroy();
        this.onConfirmCallback(-1);
    }

    private newGame(): void {
        this.destroy();
        this.onConfirmCallback(0);
    }

    private readSave(): void {
        this.destroy();
        this.onConfirmCallback(1);
    }

    private joinGame(): void {
        this.destroy();
        this.onConfirmCallback(2);
    }
}
