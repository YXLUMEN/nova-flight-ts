import {DPR} from "../utils/uit.ts";
import {HUD} from "./ui/HUD.ts";
import {Camera} from "./Camera.ts";
import {PauseOverlay} from "./ui/PauseOverlay.ts";
import {NotificationManager} from "./ui/NotificationManager.ts";
import {UITheme} from "./ui/theme.ts";

export class WorldScreen {
    public static readonly canvas = document.getElementById("game") as HTMLCanvasElement;
    public static readonly ctx = this.canvas.getContext("2d")!;

    public static VIEW_W = 800;
    public static VIEW_H = 600;

    public static readonly camera: Camera = new Camera();
    public static readonly hud: HUD = new HUD();
    public static readonly pauseOverlay = new PauseOverlay();
    public static readonly notify = new NotificationManager();

    static {
        this.ctx.font = UITheme.font;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
    }

    public static resize(w?: number, h?: number) {
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = Math.floor(rect.width * DPR);
        this.canvas.height = Math.floor(rect.height * DPR);

        this.VIEW_W = w !== undefined ? w : Math.floor(rect.width);
        this.VIEW_H = h !== undefined ? h : Math.floor(rect.height);

        this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        this.hud.setSize(this.VIEW_W, this.VIEW_H);
        this.pauseOverlay.setSize(this.VIEW_W, this.VIEW_H);
        this.notify.setSize(this.VIEW_W, this.VIEW_H);
    }
}