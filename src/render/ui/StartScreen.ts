import {StarField} from "../../effect/StarField.ts";
import {defaultLayers} from "../../configs/StarfieldConfig.ts";
import {Camera} from "../Camera.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

type StartScreenOptions = {
    title?: string;
    subtitle?: string;
    buttonText?: string;
};

export class StartScreen {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly width: number;
    private readonly height: number;

    private readonly tempCamera: Camera = new Camera();
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);

    private ctrl = new AbortController();
    private running = false;
    private onConfirmCallback?: () => void;
    private options: Required<StartScreenOptions>;

    private tickInterval = 1000 / 50;
    private lastTickTime = 0;

    public constructor(ctx: CanvasRenderingContext2D, width: number, height: number, options?: StartScreenOptions) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.options = {
            title: options?.title ?? '我的小游戏',
            subtitle: options?.subtitle ?? '按下开始键进入游戏',
            buttonText: options?.buttonText ?? '开始游戏'
        };

        this.starField.init();
    }

    public onConfirm(cb?: () => void) {
        return new Promise<void>(resolve => {
            this.onConfirmCallback = () => {
                resolve();
                if (cb) cb();
            }
        });
    }

    public loop() {
        this.running = true;
        this.tempCamera.update(MutVec2.zero(), 0);

        const render = (time: number) => {
            if (!this.running) return;

            if (!this.lastTickTime) {
                this.lastTickTime = time;
            }

            let elapsed = time - this.lastTickTime;
            while (elapsed >= this.tickInterval) {
                this.starField.update(1 / 50, this.tempCamera);
                this.lastTickTime += this.tickInterval;
                elapsed -= this.tickInterval;
            }

            this.draw();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);

        window.addEventListener('keydown', () => this.confirm(), {signal: this.ctrl.signal});
        window.addEventListener('click', this.handleClick, {signal: this.ctrl.signal});
    }

    public stop() {
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
    };

    private confirm() {
        this.stop();
        if (this.onConfirmCallback) {
            this.onConfirmCallback();
        }
    }

    private draw() {
        const ctx = this.ctx;
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
}
