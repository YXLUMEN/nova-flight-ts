import {MutVec2} from "../../utils/math/MutVec2.ts";
import {GlobalConfig} from "../../configs/GlobalConfig.ts";
import {PI2} from "../../utils/math/math.ts";
import {Window} from "./Window.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

class ViewRect {
    public top: number = 0;
    public bottom: number = 0;
    public left: number = 0;
    public right: number = 0;
    public width: number = 0;
    public height: number = 0;

    public set(pos: Vec2, vw: number, vh: number) {
        const {x, y} = pos;
        this.left = x;
        this.top = y;
        this.right = x + vw;
        this.bottom = y + vh;
        this.width = vw;
        this.height = vh;
    }
}

export class Camera {
    private readonly offset = MutVec2.zero();
    private readonly velocity = MutVec2.zero();
    private readonly lastViewOffsetCache = MutVec2.zero();
    private readonly viewOffsetCache = MutVec2.zero();
    private readonly uiOffsetCache = MutVec2.zero();
    private readonly viewRectCache: ViewRect = new ViewRect();

    private isDeadZone = false;
    private readonly outDeadZone: number = 40 ** 2;
    private readonly intoDeadZone: number = 32 ** 2;

    private readonly followSpeed: number = 2000;
    private readonly smoothing: number = 16;
    private readonly friction: number = 12;

    private shakeTrauma = 0;       // [0,1]
    private readonly traumaPower = 2;       // 非线性放大, 常用 2 或 3
    private readonly shakeDecay = 0.8;      // 每秒衰减量
    private readonly maxShake = 48;         // 最大像素抖动
    private readonly shakeOffset = MutVec2.zero();

    private readonly uiMaxDrift = 128;      // HUD 最大漂移像素(镜头快速移动时)
    private readonly uiShakeFactor = 0.5;

    public tick(target: MutVec2, tickDelta: number): void {
        if (GlobalConfig.enableCameraOffset) {
            this.follow(target, tickDelta);
        }
        this.updateShake(tickDelta);

        this.lastViewOffsetCache.set(this.viewOffsetCache.x, this.viewOffsetCache.y);
        this.viewOffsetCache.set(
            this.offset.x + this.shakeOffset.x,
            this.offset.y + this.shakeOffset.y
        );

        const off = this.viewOffsetCache;
        this.viewRectCache.set(off, Window.viewWidth, Window.viewHeight);
    }

    public addShake(amount: number, limit = 1): void {
        if (this.shakeTrauma >= limit) return;
        this.shakeTrauma = Math.min(1, this.shakeTrauma + amount);
    }

    private follow(target: MutVec2, tickDelta: number): void {
        const desired = target.subtract(Window.viewWidth / 2, Window.viewHeight / 2);
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

    private updateShake(tickDelta: number): void {
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
            return;
        }
        // 归零, 避免长尾抖动
        if (this.shakeOffset.x !== 0 || this.shakeOffset.y !== 0) {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }
    }

    public get cameraOffset(): Vec2 {
        return this.offset;
    }

    public get viewOffset(): Vec2 {
        return this.viewOffsetCache;
    }

    public get lastViewOffset(): Vec2 {
        return this.lastViewOffsetCache;
    }

    public get viewRect(): Readonly<ViewRect> {
        return this.viewRectCache;
    }

    public get uiOffset(): Vec2 {
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

export {type ViewRect};