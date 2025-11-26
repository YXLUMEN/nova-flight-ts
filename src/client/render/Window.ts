import {DPR} from "../../utils/uit.ts";
import {HUD} from "./ui/HUD.ts";
import {Camera} from "./Camera.ts";
import {PauseOverlay} from "./ui/PauseOverlay.ts";
import {NotificationManager} from "./ui/NotificationManager.ts";
import {UITheme} from "./ui/theme.ts";

export class Window {
    public static VIEW_W = 800;
    public static VIEW_H = 600;
    public readonly canvas = document.getElementById("game") as HTMLCanvasElement;
    public readonly ctx = this.canvas.getContext("2d")!;

    public readonly camera: Camera = new Camera();
    public readonly hud: HUD = new HUD();
    public readonly pauseOverlay = new PauseOverlay();
    public readonly notify = new NotificationManager();

    public constructor() {
        this.ctx.font = UITheme.font;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
    }

    public resize(w?: number, h?: number) {
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = Math.floor(rect.width * DPR);
        this.canvas.height = Math.floor(rect.height * DPR);

        Window.VIEW_W = w !== undefined ? w : Math.floor(rect.width);
        Window.VIEW_H = h !== undefined ? h : Math.floor(rect.height);

        this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        this.hud.setSize(Window.VIEW_W, Window.VIEW_H);
        this.pauseOverlay.setSize(Window.VIEW_W, Window.VIEW_H);
        this.notify.setSize(Window.VIEW_W, Window.VIEW_H);
    }
}