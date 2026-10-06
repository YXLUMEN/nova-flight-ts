import type {Vec2} from "../../utils/math/Vec2.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {RuntimeConfig} from "../../configs/RuntimeConfig.ts";
import {noise1} from "../../utils/math/math.ts";
import {ClientWindow} from "./ClientWindow.ts";


export class Camera {
    private readonly offset = MutVec2.zero();
    private readonly velocity = MutVec2.zero();

    private readonly viewOffsetVec = MutVec2.zero();
    private readonly lastViewOffsetVec = MutVec2.zero();

    private readonly uiOffsetVec = MutVec2.zero();
    private readonly lastUiOffsetVec = MutVec2.zero();

    private readonly viewRectCache: ViewRect = new ViewRect();

    /** 平滑时间(秒): 越小越跟手 */
    private readonly smoothTime: number = 0.15;
    /** 速度上限(px/s): 仅用于限制瞬移/出生等大跳变 */
    private readonly maxSpeed: number = 6000;
    /** HUD 漂移归一化参考速度(px/s) */
    private readonly uiDriftSpeedRef: number = 2000;

    private shakeTrauma = 0;       // [0,1]
    private readonly traumaPower = 1.4;       // 非线性放大, 常用 2 或 3
    private readonly shakeDecay = 0.8;      // 每秒衰减量
    private readonly maxShake = 64;         // 最大像素抖动
    private readonly shakeFreqFast = 24;    // 低强度时的频率(Hz)
    private readonly shakeFreqSlow = 4;     // 高强度时的频率(Hz)
    private readonly shakeRoughRatio = 2.5; // 细节噪声相对主噪声的倍频
    private readonly shakeRoughFreqCap = 20;// 细节噪声频率上限, 防止采样率不足产生走样
    private readonly shakeOffset = MutVec2.zero();
    private shakeTime = 0;                  // 主噪声相位
    private shakeRoughTime = 0;             // 细节噪声相位

    private readonly uiMaxDrift = 60;      // HUD 最大漂移像素(镜头快速移动时)
    private readonly uiShakeFactor = 0.5;

    public tick(target: MutVec2, tickDelta: number): void {
        if (RuntimeConfig.enableCameraOffset) {
            this.follow(target, tickDelta);
        }
        this.updateShake(tickDelta);
        this.updateUiOffset();

        this.lastViewOffsetVec.set(this.viewOffsetVec.x, this.viewOffsetVec.y);
        this.viewOffsetVec.set(
            this.offset.x + this.shakeOffset.x,
            this.offset.y + this.shakeOffset.y
        );

        const off = this.viewOffsetVec;
        this.viewRectCache.set(off, ClientWindow.viewWidth, ClientWindow.viewHeight);
    }

    public addShake(amount: number, limit = 1): void {
        this.shakeTrauma = Math.min(limit, this.shakeTrauma + amount);
    }

    private follow(target: MutVec2, tickDelta: number): void {
        // 目标位于视口中心时, 相机偏移应处的期望位置
        const desiredX = target.x - ClientWindow.viewWidth / 2;
        const desiredY = target.y - ClientWindow.viewHeight / 2;

        // SmoothDamp
        const smoothTime = Math.max(1e-4, this.smoothTime);
        const omega = 2 / smoothTime;
        const x = omega * tickDelta;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

        // change = current - target
        let changeX = this.offset.x - desiredX;
        let changeY = this.offset.y - desiredY;

        // 限制单步最大位移(速度上限), 避免瞬移时相机狂飙
        const maxChange = this.maxSpeed * smoothTime;
        const changeLen = Math.hypot(changeX, changeY);
        if (changeLen > maxChange && changeLen > 0) {
            const s = maxChange / changeLen;
            changeX *= s;
            changeY *= s;
        }

        const targetX = this.offset.x - changeX;
        const targetY = this.offset.y - changeY;

        const tempX = (this.velocity.x + omega * changeX) * tickDelta;
        const tempY = (this.velocity.y + omega * changeY) * tickDelta;

        this.velocity.x = (this.velocity.x - omega * tempX) * exp;
        this.velocity.y = (this.velocity.y - omega * tempY) * exp;

        let outX = targetX + (changeX + tempX) * exp;
        let outY = targetY + (changeY + tempY) * exp;

        // 到达末端时立刻到位, 避免无限逼近导致的残留抖动
        if ((desiredX - this.offset.x > 0) === (outX > desiredX)) {
            outX = desiredX;
            this.velocity.x = 0;
        }
        if ((desiredY - this.offset.y > 0) === (outY > desiredY)) {
            outY = desiredY;
            this.velocity.y = 0;
        }

        this.offset.x = outX;
        this.offset.y = outY;
    }

    private updateShake(tickDelta: number): void {
        // 衰减创伤
        if (this.shakeTrauma > 0) {
            this.shakeTrauma = Math.max(0, this.shakeTrauma - this.shakeDecay * tickDelta);

            // 非线性放大
            const trauma = this.shakeTrauma;
            const amp = this.maxShake * Math.pow(trauma, this.traumaPower);
            if (amp < 0.05) {
                this.shakeOffset.x = 0;
                this.shakeOffset.y = 0;
                return;
            }

            const freq = this.shakeFreqSlow + (this.shakeFreqFast - this.shakeFreqSlow) * (1 - trauma);
            const roughFreq = Math.min(freq * this.shakeRoughRatio, this.shakeRoughFreqCap);

            this.shakeTime += tickDelta * freq;
            this.shakeRoughTime += tickDelta * roughFreq;

            const nx = noise1(this.shakeTime) + noise1(this.shakeRoughTime);
            const ny = noise1(this.shakeTime + 137.31) + noise1(this.shakeRoughTime + 71.53);

            this.shakeOffset.x = nx * amp;
            this.shakeOffset.y = ny * amp;
            return;
        }

        // 归零, 避免长尾抖动
        if (this.shakeOffset.x !== 0 || this.shakeOffset.y !== 0) {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }
    }

    private updateUiOffset() {
        const vx = this.velocity.x, vy = this.velocity.y;
        const speed = Math.hypot(vx, vy);
        let dx = 0, dy = 0;

        if (speed > 1e-3) {
            const k = Math.min(1, speed / this.uiDriftSpeedRef);
            const s = this.uiMaxDrift * k;
            dx = -(vx / speed) * s;
            dy = -(vy / speed) * s;
        }

        this.lastUiOffsetVec.setVec(this.uiOffsetVec);
        this.uiOffsetVec.set(dx + this.shakeOffset.x * this.uiShakeFactor, dy + this.shakeOffset.y * this.uiShakeFactor);
    }

    public get cameraOffset(): Vec2 {
        return this.offset;
    }

    public get viewOffset(): Vec2 {
        return this.viewOffsetVec;
    }

    public get lastViewOffset(): Vec2 {
        return this.lastViewOffsetVec;
    }

    public get viewRect(): Readonly<ViewRect> {
        return this.viewRectCache;
    }

    public get uiOffset(): MutVec2 {
        return this.uiOffsetVec;
    }

    public get lastUiOffset(): MutVec2 {
        return this.lastUiOffsetVec;
    }
}

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

export {type ViewRect};