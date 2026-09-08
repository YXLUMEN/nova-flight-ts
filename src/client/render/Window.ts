import {debounce, DPR} from "../../utils/uit.ts";
import {HUD} from "./ui/HUD.ts";
import {Camera} from "./Camera.ts";
import {PauseOverlay} from "./ui/PauseOverlay.ts";
import {UITheme} from "./ui/theme.ts";
import {DamagePopupRender} from "./ui/DamagePopupRender.ts";
import type {BiConsumer, Consumer} from "../../type/types.ts";

export class Window {
    public static viewWidth = 800;
    public static viewHeight = 600;

    public readonly canvas = document.getElementById("game") as HTMLCanvasElement;
    public readonly ctx = this.canvas.getContext("2d")!;

    public readonly camera: Camera = new Camera();
    public readonly hud: HUD = new HUD();
    public readonly pauseOverlay = new PauseOverlay();
    public readonly damagePopup = new DamagePopupRender();

    private readonly resizeCallbacks: Set<BiConsumer<number, number>> = new Set();

    public constructor() {
        this.ctx.font = UITheme.font;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.imageSmoothingEnabled = false;

        this.resize = this.resize.bind(this);
        window.onresize = debounce<unknown, any>(this.resize, 200);
    }

    public onResize(cb: BiConsumer<number, number>): Consumer<void> {
        this.resizeCallbacks.add(cb);
        return () => this.resizeCallbacks.delete(cb);
    }

    public resize() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        this.canvas.width = Math.floor(rect.width * DPR);
        this.canvas.height = Math.floor(rect.height * DPR);

        Window.viewWidth = width;
        Window.viewHeight = height;

        this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        this.hud.setSize(width, height);
        this.pauseOverlay.setSize(width, height);

        for (const cb of this.resizeCallbacks) {
            cb(width, height);
        }
    }
}