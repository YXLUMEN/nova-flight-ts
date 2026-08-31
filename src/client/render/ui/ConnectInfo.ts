import {NovaFlightClient} from "../../NovaFlightClient.ts";
import {Window} from "../Window.ts";
import {UIButton} from "./UIButton.ts";
import type {Consumer, Supplier} from "../../../type/types.ts";
import {empty} from "../../../utils/uit.ts";
import type {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {UiFramework} from "./UiFramework.ts";

export class ConnectInfo extends UiFramework {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly ctrl: AbortController;

    private message = '';
    private label = '';

    private backBtn: UIButton | null = null;
    private readonly unsubResize: Supplier<void>;
    private onDestroy: Consumer<void>;

    private readonly promise: Promise<void>;
    private readonly resolve: Consumer<void>;

    public constructor(client: NovaFlightClient, onDestroy?: Consumer<void>) {
        super();
        this.ctx = client.window.ctx;
        this.ctrl = new AbortController();

        const {promise, resolve} = Promise.withResolvers<void>();
        this.promise = promise;
        this.resolve = resolve;

        this.onDestroy = onDestroy ?? empty;
        this.unsubResize = client.window.onResize(this.setSize.bind(this));
        this.loop = this.loop.bind(this);
        this.destroy = this.destroy.bind(this);

        this.setSize(Window.viewWidth, Window.viewHeight);

        window.addEventListener('click', event => {
            if (this.backBtn && this.backBtn.hitTest(event.offsetX, event.offsetY)) {
                this.backBtn.onClick();
            }
        }, {signal: this.ctrl.signal});
        this.loop();
    }

    private loop(): void {
        if (this.ctrl.signal.aborted) return;

        this.render(this.ctx);
        requestAnimationFrame(this.loop);
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(this.message, this.halfW, this.halfH);
        if (this.backBtn) {
            ctx.font = '18px sans-serif';
            this.backBtn.render(ctx);
        }
        ctx.restore();
    }

    public setMessage(message: string | TranslatableText): void {
        this.message = message.toString();
    }

    public setLabel(label: string | TranslatableText | null): void {
        if (label === null) {
            this.label = '';
            this.backBtn = null;
            return;
        }
        this.label = label.toString();
        this.setBtn();
    }

    public setOnDestroy(fn: Consumer<void>) {
        this.onDestroy = fn;
    }

    public setSize(w: number, h: number): void {
        super.setSize(w, h);
        this.setBtn();
    }

    public destroy(): void {
        if (this.ctrl.signal.aborted) return;

        this.ctrl.abort();
        this.backBtn = null;
        this.unsubResize();
        this.resolve();
        this.onDestroy();
    }

    public waitConfirm(): Promise<void> {
        return this.promise;
    }

    public isAbort() {
        return this.ctrl.signal.aborted;
    }

    private setBtn(): void {
        const btnW = 120;
        const btnH = 40;
        const btnX = this.halfW - btnW / 2;
        const btnY = this.halfH + 80;
        this.backBtn = new UIButton(btnX, btnY, btnW, btnH, this.label, this.destroy);
    }
}