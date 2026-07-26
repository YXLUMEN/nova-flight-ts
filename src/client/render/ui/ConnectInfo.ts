import type {IUi} from "./IUi.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import {Window} from "../Window.ts";
import {UIButton} from "./UIButton.ts";
import type {Consumer, Supplier} from "../../../type/types.ts";
import {empty} from "../../../utils/uit.ts";
import type {TranslatableText} from "../../../i18n/TranslatableText.ts";

export class ConnectInfo implements IUi {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly ctrl: AbortController;

    private width: number = 0;
    private height: number = 0;
    private running = false;
    private message = '';
    private label = '';

    private backBtn: UIButton | null = null;
    private readonly unsubResize: Supplier<void>;
    private onDestroy: Consumer<void>;

    private readonly promise: Promise<void>;
    private readonly resolve: Consumer<void>;

    public constructor(client: NovaFlightClient, onDestroy?: Consumer<void>) {
        this.ctx = client.window.ctx;
        this.ctrl = new AbortController();

        const {promise, resolve} = Promise.withResolvers<void>();
        this.promise = promise;
        this.resolve = resolve;

        this.onDestroy = onDestroy ?? empty;
        this.unsubResize = client.window.onResize(this.setSize.bind(this));
        this.loop = this.loop.bind(this);
        this.destroy = this.destroy.bind(this);

        this.setSize(Window.VIEW_W, Window.VIEW_H);

        window.addEventListener('click', event => {
            if (this.backBtn && this.backBtn.hitTest(event.offsetX, event.offsetY)) {
                this.backBtn.onClick();
            }
        }, {signal: this.ctrl.signal});

        this.running = true;
        this.loop();
    }

    private loop(): void {
        if (!this.running) return;
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

        ctx.fillText(this.message, this.width / 2, this.height / 2);
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
        this.width = w;
        this.height = h
        this.setBtn();
    }

    public destroy(): void {
        if (!this.running) return;
        this.running = false;

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
        const btnX = this.width / 2 - btnW / 2;
        const btnY = this.height / 2 + 80;
        this.backBtn = new UIButton(btnX, btnY, btnW, btnH, this.label, this.destroy);
    }
}