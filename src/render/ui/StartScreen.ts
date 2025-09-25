import {StarField} from "../../effect/StarField.ts";
import {defaultLayers} from "../../configs/StarfieldConfig.ts";
import {Camera} from "../Camera.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import type {IUi} from "./IUi.ts";
import {UIButton} from "./UIButton.ts";
import {UITheme} from "./theme.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {WorldScreen} from "../WorldScreen.ts";

type StartScreenOptions = {
    title: string;
    subtitle: string;
};

export class StartScreen implements IUi {
    private readonly ctx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;

    private readonly tempCamera: Camera = new Camera();
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);

    private ctrl = new AbortController();
    private running = false;
    private onConfirmCallback?: () => void;
    private options: Required<StartScreenOptions>;

    private tickInterval = 1000 / 50;
    private lastTickTime = 0;

    private buttons: UIButton[] = [];

    public constructor(ctx: CanvasRenderingContext2D, options: StartScreenOptions) {
        this.ctx = ctx;
        this.options = {
            title: options.title,
            subtitle: options.subtitle
        };

        this.buttons.push(
            new UIButton(
                (this.width - 200) / 2, this.height / 2,
                200, 50,
                '开始游戏',
                this.confirm.bind(this),
            ),
            new UIButton(
                (this.width - 200) / 2, this.height / 2 + 60,
                200, 50,
                '读取存档',
                this.confirmAndReadSave.bind(this),
            )
        );

        this.starField.init();
    }

    public start() {
        this.running = true;
        this.tempCamera.update(MutVec2.zero(), 0);
        this.tick(0);

        window.addEventListener('keydown', event => {
            if (event.code === 'Space' || event.code === 'Enter') this.confirm();
        }, {signal: this.ctrl.signal});

        window.addEventListener('click', (event) => {
            for (const btn of this.buttons) {
                if (btn.hitTest(event.offsetX, event.offsetY)) {
                    btn.onClick();
                }
            }
        }, {signal: this.ctrl.signal});

        window.addEventListener('resize', () => {
            WorldScreen.resize();
            this.setSize(WorldScreen.VIEW_W, WorldScreen.VIEW_H);
        }, {signal: this.ctrl.signal});
    }

    public setSize(w: number, h: number) {
        this.width = w;
        this.height = h;

        const btn1 = this.buttons[0];
        btn1.x = (this.width - 200) / 2;
        btn1.y = this.height / 2;

        const btn2 = this.buttons[1];
        btn2.x = (this.width - 200) / 2;
        btn2.y = this.height / 2 + 60;
    }

    private bindTick = this.tick.bind(this);

    public tick(tickDelta: number) {
        if (!this.running) return;

        if (!this.lastTickTime) {
            this.lastTickTime = tickDelta;
        }

        let elapsed = tickDelta - this.lastTickTime;
        while (elapsed >= this.tickInterval) {
            this.starField.update(WorldConfig.mbps, this.tempCamera);
            this.lastTickTime += this.tickInterval;
            elapsed -= this.tickInterval;
        }

        this.render(this.ctx);
        requestAnimationFrame(this.bindTick);
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, this.width, this.height);

        this.starField.render(ctx, this.tempCamera);
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
        this.ctx.reset();

        (this.ctx as any) = null;
        (this.starField as any) = null;
        (this.tempCamera as any) = null;
    }

    public onConfirm(cb?: () => void) {
        return new Promise<void>(resolve => {
            this.onConfirmCallback = () => {
                resolve();
                if (cb) cb();
            }
        });
    }

    private confirm() {
        this.destroy();
        if (this.onConfirmCallback) {
            this.onConfirmCallback();
        }
    }

    private confirmAndReadSave() {
        this.confirm();
        WorldConfig.readSave = true;
    }
}
