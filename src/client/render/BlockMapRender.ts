import {Window} from "./Window.ts";
import {BitBlockMap} from "../../world/map/BitBlockMap.ts";

interface FillRectCmd {
    x: number;
    y: number;
    w: number;
    h: number;
}

export class BlockMapRender {
    private readonly window: Window;
    private readonly map: BitBlockMap;
    private readonly command: FillRectCmd[] = [];
    private dirty = true;

    private debounceTimer: number | undefined;
    private static readonly REBUILD_DELAY_MS = 3000;

    public constructor(window: Window, map: BitBlockMap) {
        this.window = window;
        this.map = map;
        this.timer = this.timer.bind(this);
    }

    public renderBlocks(ctx: CanvasRenderingContext2D): void {
        if (this.dirty) this.buildCmd();
        this.debounceTimer === undefined ? this.cmdRender(ctx) : this.promptRender(ctx);
    }

    private promptRender(ctx: CanvasRenderingContext2D) {
        const view = this.window.camera.viewRect;
        const blocksize = BitBlockMap.BLOCK_SIZE;
        const power = BitBlockMap.POWER;

        const sx = Math.max(0, view.left >> power);
        const sy = Math.max(0, view.top >> power);
        const ex = Math.min(this.map.getWidth(), (view.right + blocksize - 1) >> power);
        const ey = Math.min(this.map.getHeight(), (view.bottom + blocksize - 1) >> power);

        ctx.fillStyle = '#555';
        for (let by = sy; by < ey; by++) {
            let bx = sx;
            while (bx < ex) {
                if (this.map.get(bx, by) === 0) {
                    bx++;
                    continue;
                }

                const start = bx;
                while (bx < ex && this.map.get(bx, by) !== 0) {
                    bx++;
                }
                ctx.fillRect(
                    start * blocksize,
                    by * blocksize,
                    (bx - start) * blocksize,
                    blocksize + 1 // 避免浮点数带来的缝隙
                );
            }
        }
    }

    private cmdRender(ctx: CanvasRenderingContext2D): void {
        const view = this.window.camera.viewRect;

        ctx.fillStyle = '#555';
        for (const cmd of this.command) {
            if (cmd.x + cmd.w < view.left ||
                cmd.x > view.right ||
                cmd.y + cmd.h < view.top ||
                cmd.y > view.bottom
            ) continue;

            ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
        }
    }

    private buildCmd(): void {
        const blocksize = BitBlockMap.BLOCK_SIZE;

        const ex = this.map.getWidth();
        const ey = this.map.getHeight();

        this.command.length = 0;
        for (let by = 0; by < ey; by++) {
            let bx = 0;
            while (bx < ex) {
                if (this.map.get(bx, by) === 0) {
                    bx++;
                    continue;
                }

                const start = bx;
                while (bx < ex && this.map.get(bx, by) !== 0) {
                    bx++;
                }
                this.command.push({
                    x: start * blocksize,
                    y: by * blocksize,
                    w: (bx - start) * blocksize,
                    h: blocksize + 1
                });
            }
        }

        this.dirty = false;
    }

    private timer(): void {
        this.dirty = true;
        this.debounceTimer = undefined;
    }

    public markDirty(): void {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(this.timer, BlockMapRender.REBUILD_DELAY_MS);
    }

    public forceRebuild(): void {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = undefined;
        this.dirty = true;
    }

    public dispose(): void {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = undefined;
    }
}