import {World} from "./World.ts";
import {Vec2} from "./math/Vec2.ts";

export class Camera {
    private offset = new Vec2(0, 0);
    private velocity = new Vec2(0, 0);

    private deadZoneRadius = 30;
    private followSpeed = 2400;
    private smoothing = 20;
    private friction = 12;

    private shakeTrauma = 0;       // [0,1]
    private traumaPower = 2;       // 非线性放大, 常用 2 或 3
    private shakeDecay = 0.8;      // 每秒衰减量
    private maxShake = 48;         // 最大像素抖动
    private shakeOffset = new Vec2(0, 0);

    private uiMaxDrift = 64;      // UI 最大漂移像素(镜头快速移动时)
    private uiShakeFactor = 0.5;

    public update(target: Vec2, dt: number) {
        this.follow(target, dt);
        this.updateShake(dt);
    }

    public addShake(amount: number, limit = 1) {
        if (this.shakeTrauma >= limit) return;
        this.shakeTrauma = Math.min(1, this.shakeTrauma + amount);
    }

    public get cameraOffset(): Vec2 {
        return this.offset.clone();
    }

    public get viewOffset(): Vec2 {
        return this.offset.add(this.shakeOffset);
    }

    public get viewRect() {
        const off = this.viewOffset;
        return {
            left: off.x,
            top: off.y,
            right: off.x + World.W,
            bottom: off.y + World.H,
            width: World.W,
            height: World.H,
        };
    }

    public get uiOffset(): Vec2 {
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

        return new Vec2(
            dx + this.shakeOffset.x * this.uiShakeFactor,
            dy + this.shakeOffset.y * this.uiShakeFactor
        );
    }

    private follow(target: Vec2, dt: number) {
        if (!this.isOutsideDeadZone(target)) return;

        const desired = new Vec2(target.x - World.W / 2, target.y - World.H / 2);
        const delta = desired.sub(this.offset);

        // 使用阻尼速度, 限制最大变化
        this.velocity.x += delta.x * this.smoothing * dt;
        this.velocity.y += delta.y * this.smoothing * dt;

        // 按向量长度限速
        const len = Math.hypot(this.velocity.x, this.velocity.y);
        if (len > this.followSpeed) {
            const scale = this.followSpeed / len;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }

        // 位置积分: offset += v * dt
        this.offset.x += this.velocity.x * dt;
        this.offset.y += this.velocity.y * dt;

        // 帧率无关的指数阻尼: v *= exp(-friction * dt)
        const damping = Math.exp(-this.friction * dt);
        this.velocity.x *= damping;
        this.velocity.y *= damping;
    }

    private updateShake(dt: number) {
        // 衰减创伤
        if (this.shakeTrauma > 0) {
            this.shakeTrauma = Math.max(0, this.shakeTrauma - this.shakeDecay * dt);

            // 非线性放大
            const t = Math.pow(this.shakeTrauma, this.traumaPower);
            const r = this.maxShake * t;

            // 生成随机方向的位移
            const theta = Math.random() * Math.PI * 2;
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

    private isOutsideDeadZone(target: Vec2): boolean {
        const screenCenter = new Vec2(World.W / 2, World.H / 2);
        const playerOffset = target.sub(this.offset.add(screenCenter));
        return playerOffset.lengthSq() > this.deadZoneRadius * this.deadZoneRadius;
    }
}


