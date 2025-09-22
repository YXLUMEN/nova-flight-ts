import {StarField} from "../../effect/StarField.ts";
import {defaultLayers} from "../../configs/StarfieldConfig.ts";
import {Camera} from "../Camera.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import type {IUi} from "./IUi.ts";
import {World} from "../../world/World.ts";

type StartScreenOptions = {
    title?: string;
    subtitle?: string;
    buttonText?: string;
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

    public constructor(ctx: CanvasRenderingContext2D, options?: StartScreenOptions) {
        this.ctx = ctx;
        this.options = {
            title: options?.title ?? '我的小游戏',
            subtitle: options?.subtitle ?? '按下开始键进入游戏',
            buttonText: options?.buttonText ?? '开始游戏'
        };

        this.starField.init();

    }

    public start() {
        this.running = true;
        this.tempCamera.update(MutVec2.zero(), 0);
        this.tick(0);

        window.addEventListener('keydown', event => {
            if (event.code === 'Space' || event.code === 'Enter') this.confirm();
        }, {signal: this.ctrl.signal});
        window.addEventListener('click', this.handleClick, {signal: this.ctrl.signal});
        window.addEventListener('resize', () => {
            World.resize();
            this.setWorldSize(World.W, World.H);
        }, {signal: this.ctrl.signal});
    }

    public setWorldSize(w: number, h: number) {
        this.width = w;
        this.height = h;
    }

    private bindTick = this.tick.bind(this);

    public tick(tickDelta: number) {
        if (!this.running) return;

        if (!this.lastTickTime) {
            this.lastTickTime = tickDelta;
        }

        let elapsed = tickDelta - this.lastTickTime;
        while (elapsed >= this.tickInterval) {
            this.starField.update(1 / 50, this.tempCamera);
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
        ctx.fillText(this.options.title, this.width / 2, this.height / 2 - 100);

        // 副标题
        ctx.font = '24px sans-serif';
        ctx.fillText(this.options.subtitle, this.width / 2, this.height / 2 - 50);

        // 按钮
        const btnW = 200;
        const btnH = 50;
        const btnX = (this.width - btnW) / 2;
        const btnY = this.height / 2 + 50;

        ctx.fillStyle = '#444';
        ctx.fillRect(btnX, btnY, btnW, btnH);

        ctx.strokeStyle = '#fff';
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.fillText(this.options.buttonText, this.width / 2, btnY + btnH / 2 + 7);
    }

    public destroy() {
        this.running = false;
        this.ctrl.abort();
        this.ctx.reset();

        (this.ctx as any) = null;
        (this.starField as any) = null;
        (this.tempCamera as any) = null;
    }

    private handleClick = (e: MouseEvent) => {
        const btnW = 200;
        const btnH = 50;
        const btnX = (this.width - btnW) / 2;
        const btnY = this.height / 2 + 50;
        if (e.offsetX >= btnX && e.offsetX <= btnX + btnW &&
            e.offsetY >= btnY && e.offsetY <= btnY + btnH) {
            this.confirm();
        }
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
}
