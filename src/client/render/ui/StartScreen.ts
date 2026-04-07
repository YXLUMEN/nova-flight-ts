import {StarField} from "../../../effect/StarField.ts";
import {lowPowerLayers} from "../../../configs/StarfieldConfig.ts";
import {Camera} from "../Camera.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import type {IUi} from "./IUi.ts";
import {UIButton} from "./UIButton.ts";
import {UITheme} from "./theme.ts";
import {Window} from "../Window.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {Consumer, Supplier} from "../../../type/types.ts";

type StartScreenOptions = {
    title: string;
    subtitle: string;
};

export class StartScreen implements IUi {
    private readonly ctx: CanvasRenderingContext2D;
    private width: number = 0;
    private height: number = 0;

    private readonly tempCamera: Camera = new Camera();
    private readonly starField: StarField = new StarField(96, lowPowerLayers, 8);

    private readonly ctrl = new AbortController();
    private readonly options: Required<StartScreenOptions>;

    private running = false
    private tickInterval = 1000 / 50;
    private lastTickTime = 0;

    private readonly waitConfirm: Promise<number>;
    private readonly complete: Consumer<number>;
    private readonly unsubResize: Supplier<void>;

    private readonly buttons: UIButton[] = [];
    private readonly bindTick = this.tick.bind(this);

    private mouseNormX: number = 0;
    private mouseNormY: number = 0;

    private parallaxX: number = 0;
    private parallaxY: number = 0;
    // 星空视差最大像素偏移
    private readonly STAR_PARALLAX_STRENGTH = 18;
    // UI 元素视差最大像素偏移
    private readonly UI_PARALLAX_STRENGTH = 6;
    // 视差平滑插值系数,越小越滞后，越大越灵敏
    private readonly PARALLAX_LERP = 0.08;

    public constructor(client: NovaFlightClient, options: StartScreenOptions) {
        const {promise, resolve} = Promise.withResolvers<number>();
        this.waitConfirm = promise;
        this.complete = (action: number) => {
            resolve(action);
            this.destroy();
        };

        this.ctx = client.window.ctx;
        this.options = {
            title: options.title,
            subtitle: options.subtitle
        };

        this.starField.init();
        this.setSize(Window.VIEW_W, Window.VIEW_H);

        this.unsubResize = client.window.onResize(this.setSize.bind(this));

        this.start();
    }

    public start() {
        this.running = true;
        this.tempCamera.update(MutVec2.zero(), 0);
        this.tick(0);

        window.addEventListener('click', (event) => {
            for (const btn of this.buttons) {
                if (btn.hitTest(event.offsetX, event.offsetY)) {
                    btn.onClick();
                }
            }
        }, {signal: this.ctrl.signal});

        window.addEventListener('mousemove', (event) => {
            this.mouseNormX = (event.clientX / this.width - 0.5) * 2;
            this.mouseNormY = (event.clientY / this.height - 0.5) * 2;
        }, {signal: this.ctrl.signal, passive: true});
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

        this.parallaxX += (this.mouseNormX - this.parallaxX) * this.PARALLAX_LERP;
        this.parallaxY += (this.mouseNormY - this.parallaxY) * this.PARALLAX_LERP;

        this.render(this.ctx);
        requestAnimationFrame(this.bindTick);
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, this.width, this.height);

        const starOffX = this.parallaxX * this.STAR_PARALLAX_STRENGTH;
        const starOffY = this.parallaxY * this.STAR_PARALLAX_STRENGTH;

        ctx.save();
        ctx.translate(starOffX, starOffY);
        this.starField.render(ctx, this.tempCamera, 1);
        ctx.restore();

        const uiOffX = -this.parallaxX * this.UI_PARALLAX_STRENGTH;
        const uiOffY = -this.parallaxY * this.UI_PARALLAX_STRENGTH;

        ctx.save();
        ctx.translate(uiOffX, uiOffY);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.options.title, this.width / 2, this.height / 2 - 100);

        ctx.font = '24px sans-serif';
        ctx.fillText(this.options.subtitle, this.width / 2, this.height / 2 - 50);

        ctx.font = UITheme.font;
        for (const btn of this.buttons) {
            btn.render(ctx);
        }

        ctx.restore();
    }

    public destroy() {
        this.running = false;
        this.ctrl.abort();
        this.unsubResize();

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
        const w = 200;
        const h = 50;

        this.buttons.length = 0;
        this.buttons.push(
            new UIButton(startX, startY, w, h, '开始游戏', () => this.complete(0)),
            new UIButton(startX, startY + 60, w, h, '加入游戏', () => this.complete(1)),
            new UIButton(startX, startY + 120, w, h, '统计数据', () => this.complete(2)),
            new UIButton(startX, startY + 180, w, h, '退出游戏', () => this.complete(-1))
        );
    }
}
