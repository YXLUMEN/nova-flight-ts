import type {IUi} from "./IUi.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import {Window} from "../Window.ts";
import {UIButton} from "./UIButton.ts";
import type {Consumer} from "../../../apis/types.ts";

export class ConnectInfo implements IUi {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly ctrl: AbortController;
    private backBtn!: UIButton;

    private width: number = 0;
    private height: number = 0;
    private running = false;
    private message = '';
    private error: boolean = false;

    private readonly onErr: Consumer<void> | undefined;
    private readonly promise: Promise<void>;
    private readonly resolve: Consumer<void>;

    private readonly bindLoop = this.loop.bind(this);

    public constructor(ctx: CanvasRenderingContext2D, onErr?: Consumer<void>) {
        this.ctx = ctx;
        this.ctrl = new AbortController();

        const {promise, resolve} = Promise.withResolvers<void>();
        this.promise = promise;
        this.resolve = resolve;
        this.onErr = onErr;

        this.setSize(Window.VIEW_W, Window.VIEW_H);
        this.setBtn();

        window.addEventListener('resize', () => {
            NovaFlightClient.getInstance().window.resize();
            this.setSize(Window.VIEW_W, Window.VIEW_H);
        }, {signal: this.ctrl.signal});

        window.addEventListener('click', (event) => {
            if (this.error && this.backBtn.hitTest(event.offsetX, event.offsetY)) {
                this.backBtn.onClick();
            }
        }, {signal: this.ctrl.signal});

        this.running = true;
        this.loop();
    }

    private loop(): void {
        if (!this.running) return;
        this.render(this.ctx);
        requestAnimationFrame(this.bindLoop);
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(this.message, this.width / 2, this.height / 2);
        if (this.error) {
            ctx.font = '18px sans-serif';
            this.backBtn.render(ctx);
        }
        ctx.restore();
    }

    public setMessage(message: string): void {
        this.message = message;
    }

    public async setError(message?: string): Promise<void> {
        if (message !== undefined) this.setMessage(message);
        this.error = true;

        await this.promise;
        this.onErr?.();
    }

    public setSize(w: number, h: number): void {
        this.width = w;
        this.height = h
        this.setBtn();
    }

    public destroy(): void {
        this.running = false;
        this.ctrl.abort();
        this.resolve();
    }

    public waitConfirm(): Promise<void> {
        return this.promise;
    }

    private setBtn(): void {
        const btnW = 120;
        const btnH = 40;
        const btnX = this.width / 2 - btnW / 2;
        const btnY = this.height / 2 + 80;
        this.backBtn = new UIButton(btnX, btnY, btnW, btnH, "确认", this.destroy.bind(this));
    }
}