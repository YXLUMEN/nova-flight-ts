import {Camera} from "../../render/Camera.ts";
import {StarField} from "../../../effect/StarField.ts";
import {lowPowerLayers} from "../../../configs/StarfieldConfig.ts";
import {ClientWindow} from "../../render/ClientWindow.ts";
import {UiFramework} from "../../render/ui/UiFramework.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";

// 星空视差最大像素偏移
const STAR_PARALLAX_STRENGTH = 32;
// UI 元素视差最大像素偏移
const UI_PARALLAX_STRENGTH = 8;
// 视差平滑插值系数,越小越滞后，越大越灵敏
const PARALLAX_LERP = 0.08;

export class StartScreenStarfield extends UiFramework {
    private readonly element: HTMLElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly tempCamera: Camera = new Camera();
    private readonly starField: StarField = new StarField(96, lowPowerLayers, 8);
    private readonly ctrl = new AbortController();

    private started = false;
    private tickInterval = 1000 / 50;
    private lastTickTime = 0;

    private mouseNormX: number = 0;
    private mouseNormY: number = 0;
    private parallaxX: number = 0;
    private parallaxY: number = 0;

    public constructor(client: NovaFlightClient, element: HTMLElement) {
        super();

        this.element = element;
        this.ctx = client.window.ctx;
        this.starField.init();

        this.tick = this.tick.bind(this);
        this.setSize = this.setSize.bind(this);
        this.setSize(ClientWindow.viewWidth, ClientWindow.viewHeight);
        const unsubResize = client.window.onResize(this.setSize);
        this.ctrl.signal.addEventListener('abort', () => unsubResize(), {once: true});
    }

    public start() {
        if (this.started || this.ctrl.signal.aborted) return;
        this.started = true;

        this.tempCamera.tick(MutVec2.zero(), 0);
        this.tick(0);

        window.addEventListener('mousemove', (event) => {
            this.mouseNormX = (event.clientX / this.width - 0.5) * 2;
            this.mouseNormY = (event.clientY / this.height - 0.5) * 2;

            const uiOffX = -this.parallaxX * UI_PARALLAX_STRENGTH;
            const uiOffY = -this.parallaxY * UI_PARALLAX_STRENGTH;

            // css 平滑
            this.element.style.setProperty('--x', `${uiOffX}px`);
            this.element.style.setProperty('--y', `${uiOffY}px`);
        }, {signal: this.ctrl.signal, passive: true});
    }

    public tick(tickDelta: number): void {
        if (this.ctrl.signal.aborted) return;

        if (!this.lastTickTime) {
            this.lastTickTime = tickDelta;
        }

        let elapsed = tickDelta - this.lastTickTime;
        while (elapsed >= this.tickInterval) {
            this.starField.update(0.02, this.tempCamera);
            this.lastTickTime += this.tickInterval;
            elapsed -= this.tickInterval;
        }

        this.parallaxX += (this.mouseNormX - this.parallaxX) * PARALLAX_LERP;
        this.parallaxY += (this.mouseNormY - this.parallaxY) * PARALLAX_LERP;

        this.render(this.ctx);
        requestAnimationFrame(this.tick);
    }

    public render(ctx: CanvasRenderingContext2D): void {
        const starOffX = this.parallaxX * STAR_PARALLAX_STRENGTH;
        const starOffY = this.parallaxY * STAR_PARALLAX_STRENGTH;

        ctx.clearRect(0, 0, this.width, this.height);
        ctx.save();
        ctx.translate(starOffX, starOffY);
        this.starField.render(ctx, this.tempCamera, 1);
        ctx.restore();
    }

    public destroy(): void {
        this.ctrl.abort();
    }
}