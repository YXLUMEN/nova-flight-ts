import {MutVec2} from "../../utils/math/MutVec2.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {PI2} from "../../utils/math/math.ts";
import {Window} from "./Window.ts";

export interface ViewRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

export class Camera {
    private readonly offset = MutVec2.zero();
    private readonly velocity = MutVec2.zero();
    private readonly lastViewOffsetCache = MutVec2.zero();
    private readonly viewOffsetCache = MutVec2.zero();
    private readonly uiOffsetCache = MutVec2.zero();
    private viewRectCache: ViewRect = {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
    };

    private isDeadZone = false;
    private readonly outDeadZone: number = 40 ** 2;
    private readonly intoDeadZone: number = 32 ** 2;

    private readonly followSpeed: number = 2000;
    private readonly smoothing: number = 16;
    private readonly friction: number = 12;

    private shakeTrauma = 0;       // [0,1]
    private traumaPower = 2;       // 非线性放大, 常用 2 或 3
    private shakeDecay = 0.8;      // 每秒衰减量
    private maxShake = 48;         // 最大像素抖动
    private shakeOffset = MutVec2.zero();

    private uiMaxDrift = 128;      // HUD 最大漂移像素(镜头快速移动时)
    private uiShakeFactor = 0.5;

    public update(target: MutVec2, tickDelta: number): void {
        if (WorldConfig.enableCameraOffset) {
            this.follow(target, tickDelta);
        }
        this.updateShake(tickDelta);

        this.lastViewOffsetCache.set(this.viewOffsetCache.x, this.viewOffsetCache.y);
        this.viewOffsetCache.set(
            this.offset.x + this.shakeOffset.x,
            this.offset.y + this.shakeOffset.y
        );

        const off = this.viewOffsetCache;
        this.viewRectCache = {
            left: off.x,
            top: off.y,
            right: off.x + Window.VIEW_W,
            bottom: off.y + Window.VIEW_H,
            width: Window.VIEW_W,
            height: Window.VIEW_H,
        };
    }

    public addShake(amount: number, limit = 1): void {
        if (this.shakeTrauma >= limit) return;
        this.shakeTrauma = Math.min(1, this.shakeTrauma + amount);
    }

    private follow(target: MutVec2, tickDelta: number): void {
        const desired = target.subtract(Window.VIEW_W / 2, Window.VIEW_H / 2);
        const delta = desired.subVec(this.offset);
        const distSq = delta.lengthSquared();

        if (this.isDeadZone) {
            if (distSq > this.outDeadZone) {
                this.isDeadZone = false;
            } else {
                return;
            }
        }
        if (distSq <= this.intoDeadZone) {
            this.isDeadZone = true;
            return;
        }

        this.velocity.x += delta.x * this.smoothing * tickDelta;
        this.velocity.y += delta.y * this.smoothing * tickDelta;

        const len = this.velocity.length();
        if (len > this.followSpeed) {
            const scale = this.followSpeed / len;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }

        this.offset.x += this.velocity.x * tickDelta;
        this.offset.y += this.velocity.y * tickDelta;

        const damping = Math.exp(-this.friction * tickDelta);
        this.velocity.x *= damping;
        this.velocity.y *= damping;
    }

    private updateShake(tickDelta: number) {
        // 衰减创伤
        if (this.shakeTrauma > 0) {
            this.shakeTrauma = Math.max(0, this.shakeTrauma - this.shakeDecay * tickDelta);

            // 非线性放大
            const t = Math.pow(this.shakeTrauma, this.traumaPower);
            const r = this.maxShake * t;

            // 生成随机方向的位移
            const theta = Math.random() * PI2;
            this.shakeOffset.x = Math.cos(theta) * r;
            this.shakeOffset.y = Math.sin(theta) * r;
        } else {
            // 归零, 避免长尾抖动
            if (this.shakeOffset.x !== 0 || this.shakeOffset.y !== 0) {
                this.shakeOffset.x = 0;
                this.shakeOffset.y = 0;
            }
        }
    }

    public get cameraOffset(): MutVec2 {
        return this.offset;
    }

    public get viewOffset(): MutVec2 {
        return this.viewOffsetCache;
    }

    public get lastViewOffset(): MutVec2 {
        return this.lastViewOffsetCache;
    }

    public get viewRect(): ViewRect {
        return this.viewRectCache;
    }

    public get uiOffset(): MutVec2 {
        const vx = this.velocity.x, vy = this.velocity.y;
        const speed = Math.hypot(vx, vy);
        let dx = 0, dy = 0;

        if (speed > 1e-3) {
            const k = Math.min(1, speed / this.followSpeed);
            const s = this.uiMaxDrift * k;
            dx = -(vx / speed) * s;
            dy = -(vy / speed) * s;
        }

        return this.uiOffsetCache.set(dx + this.shakeOffset.x * this.uiShakeFactor, dy + this.shakeOffset.y * this.uiShakeFactor);
    }
}

