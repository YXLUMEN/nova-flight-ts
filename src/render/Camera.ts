import {World} from "../world/World.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {PI2} from "../utils/math/math.ts";

interface ViewRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

export class Camera {
    private offset = new MutVec2(0, 0);
    private velocity = new MutVec2(0, 0);
    private viewOffsetCache = new MutVec2(0, 0);
    private uiOffsetCache = new MutVec2(0, 0);
    private viewRectCache: ViewRect = {
        top: 0,
        bottom: World.H,
        left: World.W,
        right: 0,
        width: World.W,
        height: World.H
    };

    private deadZoneRadius = 60;
    private followSpeed = 2400;
    private smoothing = 20;
    private friction = 12;

    private shakeTrauma = 0;       // [0,1]
    private traumaPower = 2;       // 非线性放大, 常用 2 或 3
    private shakeDecay = 0.8;      // 每秒衰减量
    private maxShake = 48;         // 最大像素抖动
    private shakeOffset = new MutVec2(0, 0);

    private uiMaxDrift = 64;      // UI 最大漂移像素(镜头快速移动时)
    private uiShakeFactor = 0.5;

    public update(target: MutVec2, tickDelta: number): void {
        if (WorldConfig.enableCameraOffset) this.follow(target, tickDelta);
        this.updateShake(tickDelta);

        this.viewOffsetCache.set(
            this.offset.x + this.shakeOffset.x,
            this.offset.y + this.shakeOffset.y
        );

        const off = this.viewOffsetCache;
        this.viewRectCache = {
            left: off.x,
            top: off.y,
            right: off.x + World.W,
            bottom: off.y + World.H,
            width: World.W,
            height: World.H,
        };
    }

    public addShake(amount: number, limit = 1): void {
        if (this.shakeTrauma >= limit) return;
        this.shakeTrauma = Math.min(1, this.shakeTrauma + amount);
    }

    private follow(target: MutVec2, tickDelta: number): void {
        if (!this.isOutsideDeadZone(target)) return;

        const desired = target.sub(World.W / 2, World.H / 2);
        const delta = desired.subVec(this.offset);

        // 使用阻尼速度, 限制最大变化
        this.velocity.x += delta.x * this.smoothing * tickDelta;
        this.velocity.y += delta.y * this.smoothing * tickDelta;

        // 按向量长度限速
        const len = Math.hypot(this.velocity.x, this.velocity.y);
        if (len > this.followSpeed) {
            const scale = this.followSpeed / len;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }

        // 位置积分: offset += v * tickDelta
        this.offset.x += this.velocity.x * tickDelta;
        this.offset.y += this.velocity.y * tickDelta;

        // 帧率无关的指数阻尼: v *= exp(-friction * tickDelta)
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

    private isOutsideDeadZone(target: MutVec2): boolean {
        const x = this.offset.x + World.W / 2;
        const y = this.offset.y + World.H / 2;
        const dx = target.x - x;
        const dy = target.y - y;
        return dx * dx + dy * dy > this.deadZoneRadius * this.deadZoneRadius;
    }

    public get cameraOffset(): MutVec2 {
        return this.offset;
    }

    public get viewOffset(): MutVec2 {
        return this.viewOffsetCache;
    }

    public get viewRect(): ViewRect {
        return this.viewRectCache!;
    }

    public getCameraOffset(): Vec2 {
        return Vec2.formVec(this.offset);
    }

    public getViewOffset(): Vec2 {
        return Vec2.formVec(this.viewOffset);
    }

    public getViewRect(): ViewRect {
        return {...this.viewRectCache!};
    }

    public getUiOffset(): Vec2 {
        return Vec2.formVec(this.uiOffset);
    }

    public get uiOffset(): MutVec2 {
        // 基于相机速度方向的微漂移
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

