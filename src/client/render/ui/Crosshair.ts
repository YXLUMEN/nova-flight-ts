import {clamp, HALF_PI, lerp, PI2} from "../../../utils/math/math.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ItemStack} from "../../../item/ItemStack.ts";
import {Weapon} from "../../../item/weapon/Weapon.ts";
import {BaseWeapon} from "../../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {RocketLauncher} from "../../../item/weapon/BaseWeapon/RocketLauncher.ts";
import {ParticleLance} from "../../../item/weapon/BaseWeapon/ParticleLance.ts";
import {ArcEmitter} from "../../../item/weapon/BaseWeapon/ArcEmitter.ts";
import {FocusedArcEmitter} from "../../../item/weapon/BaseWeapon/FocusedArcEmitter.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import type {ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";

export const CrosshairType = {
    DEFAULT: 0,
    BASE_WEAPON: 1,
    MISSILE: 2,
    LANCE: 3,
    ARC: 4,
} as const;

export type CrosshairTypeValue = typeof CrosshairType[keyof typeof CrosshairType];

export class Crosshair {
    private reloading = false;

    /** 准星扩散量 [0, 1]，由发射冷却比率驱动，lerp 平滑 */
    private spreadAmount: number = 0;

    /** 当前武器 getMaxSpread() 缓存，用于缩放视觉扩散幅度 */
    private maxSpread: number = 0;

    /** 后坐力水平偏移（指数衰减） */
    private recoilX: number = 0;

    /** 后坐力垂直偏移（指数衰减） */
    private recoilY: number = 0;

    /** 后坐力峰值门控，0 时停止衰减计算 */
    private recoilPeak: number = 0;

    /** 当前准星类型，对应 CrosshairType 常量 */
    private crosshairType: CrosshairTypeValue = CrosshairType.DEFAULT;

    /** 当前武器 UI 颜色缓存 */
    private weaponColor: string = '#fff';

    /** 上一帧冷却比率，用于差分检测开火瞬间 */
    private prevCooldownRatio: number = 1;

    /** 当前武器冷却比率（0=冷却中 → 1=就绪），供 HUD 读取绘制冷却条 */
    public displayRatio: number = 0;

    private static readonly RECOIL_DECAY = 0.82;
    private static readonly SPREAD_LERP = 0.12;

    public update(player: ClientPlayerEntity, tickDelta: number): boolean {
        const stack = player.getCurrentItem();
        const item = stack.getItem();

        if (stack.isEmpty() || !(item instanceof Weapon)) {
            this.crosshairType = CrosshairType.DEFAULT;
            this.spreadAmount = 0;
            this.reloading = false;
            return false;
        }

        this.detectWeaponType(item, stack);

        let ratio: number;
        const reloadLeft = player.cooldownManager.getCooldownTicks(item);
        if (reloadLeft > 0) {
            ratio = clamp(1 - reloadLeft / stack.getOrDefault(DataComponents.MAX_RELOAD_TIME, 1), 0, 1);
            this.reloading = true;
        } else {
            ratio = clamp(1 - item.getCooldown(stack) / item.getMaxCooldown(stack), 0, 1);
            this.reloading = false;
        }

        this.displayRatio = lerp(tickDelta, this.displayRatio, ratio);

        if (!this.reloading) {
            const cooldownDrop = this.prevCooldownRatio - ratio;
            if (cooldownDrop > 0.3) {
                const angle = Math.random() * PI2;
                const strength = 1 + cooldownDrop * this.maxSpread;
                this.recoilX = Math.cos(angle) * strength;
                this.recoilY = Math.sin(angle) * strength;
                this.recoilPeak = 1;
            }
        }
        this.prevCooldownRatio = ratio;

        const targetSpread = this.reloading ? 1 : (1 - ratio);
        this.spreadAmount += (targetSpread - this.spreadAmount) * Crosshair.SPREAD_LERP;

        return true;
    }

    public render(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        if (client.isPause()) return;

        // 后坐力衰减
        if (this.recoilPeak > 0) {
            this.recoilPeak *= Crosshair.RECOIL_DECAY;
            this.recoilX *= Crosshair.RECOIL_DECAY;
            this.recoilY *= Crosshair.RECOIL_DECAY;
            if (this.recoilPeak < 0.01) {
                this.recoilPeak = 0;
                this.recoilX = 0;
                this.recoilY = 0;
            }
        }

        if (this.reloading) {
            this.renderReload(ctx, client);
            return;
        }

        switch (this.crosshairType) {
            case CrosshairType.BASE_WEAPON:
                this.renderMainWeapon(ctx, client);
                break;
            case CrosshairType.MISSILE:
                this.renderMissile(ctx, client);
                break;
            case CrosshairType.LANCE:
                this.renderLance(ctx, client);
                break;
            case CrosshairType.ARC:
                this.renderArc(ctx, client);
                break;
            default:
                this.renderDefault(ctx, client);
        }
    }

    private detectWeaponType(item: Weapon, stack: ItemStack): void {
        if (item instanceof RocketLauncher) {
            this.crosshairType = CrosshairType.MISSILE;
            this.weaponColor = item.getUiColor();
            this.maxSpread = item.getMaxSpread();
        } else if (item instanceof FocusedArcEmitter || item instanceof ArcEmitter) {
            this.crosshairType = CrosshairType.ARC;
            this.weaponColor = item.getUiColor();
            this.maxSpread = item.getMaxSpread();
        } else if (item instanceof ParticleLance) {
            this.crosshairType = CrosshairType.LANCE;
            this.weaponColor = item.getUiColor();
            this.maxSpread = item.getMaxSpread();
        } else if (item instanceof BaseWeapon) {
            this.crosshairType = CrosshairType.BASE_WEAPON;
            this.weaponColor = item.getUiColor(stack);
            this.maxSpread = item.getMaxSpread();
        } else {
            this.crosshairType = CrosshairType.DEFAULT;
            this.weaponColor = '#fff';
            this.maxSpread = 0;
        }
    }

    private renderDefault(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const {x, y} = client.input.getScreenPointer();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    private renderReload(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const {x, y} = client.input.getScreenPointer();
        const endAngle = HALF_PI + PI2 * this.displayRatio;

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, PI2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 10, HALF_PI, endAngle);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.lineWidth = 1;
    }

    /** 主武器：四段分离十字线 + 扩散 + 后坐力 */
    private renderMainWeapon(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const ptr = client.input.getScreenPointer();
        const cx = ptr.x + this.recoilX;
        const cy = ptr.y + this.recoilY;

        const maxGapExtra = 8 + Math.min(this.maxSpread, 20) * 0.4;
        const gap = 4 + this.spreadAmount * maxGapExtra;
        const len = 10 - this.spreadAmount * 2;
        const lw = 1.5 + this.spreadAmount * 1.5;

        const color = this.weaponColor;
        ctx.lineWidth = lw;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = this.spreadAmount > 0.3 ? 6 : 0;

        ctx.beginPath();
        ctx.moveTo(cx, cy - gap);
        ctx.lineTo(cx, cy - gap - len);
        ctx.moveTo(cx, cy + gap);
        ctx.lineTo(cx, cy + gap + len);
        ctx.moveTo(cx - gap, cy);
        ctx.lineTo(cx - gap - len, cy);
        ctx.moveTo(cx + gap, cy);
        ctx.lineTo(cx + gap + len, cy);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, PI2);
        ctx.fill();

        ctx.lineWidth = 1;
    }

    /** 火箭/导弹：圆形瞄准圈 + 四刻度线 */
    private renderMissile(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const ptr = client.input.getScreenPointer();
        const cx = ptr.x + this.recoilX;
        const cy = ptr.y + this.recoilY;

        const maxRadiusExtra = Math.min(this.maxSpread, 20) * 0.3;
        const radius = 14 + this.spreadAmount * (8 + maxRadiusExtra);
        const color = this.weaponColor;

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;

        if (this.spreadAmount > 0.2) {
            ctx.setLineDash([4, 4]);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, PI2);
        ctx.stroke();
        ctx.setLineDash([]);

        const tickLen = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius - tickLen);
        ctx.lineTo(cx, cy - radius + tickLen);
        ctx.moveTo(cx, cy + radius - tickLen);
        ctx.lineTo(cx, cy + radius + tickLen);
        ctx.moveTo(cx - radius - tickLen, cy);
        ctx.lineTo(cx - radius + tickLen, cy);
        ctx.moveTo(cx + radius - tickLen, cy);
        ctx.lineTo(cx + radius + tickLen, cy);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, PI2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.lineWidth = 1;
    }

    /**
     * 光矛分支（ParticleLance / TachyonLance）：
     * 窄缝准星 — 上下两条平行短线 + 中心点
     * 充能冷却时线条向中心收拢（gap 缩小）。
     */
    private renderLance(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const ptr = client.input.getScreenPointer();
        const cx = ptr.x + this.recoilX;
        const cy = ptr.y + this.recoilY;

        // 充能中 spread 趋近 1 → gap 最大；就绪时 spread ≈ 0 → gap 最小
        const gap = 3 + this.spreadAmount * 6;
        const halfLen = 14 - this.spreadAmount * 4;
        const lw = 1.5;
        const color = this.weaponColor;

        ctx.lineWidth = lw;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = this.spreadAmount < 0.15 ? 10 : 4;

        // 上边水平线
        ctx.beginPath();
        ctx.moveTo(cx - halfLen, cy - gap);
        ctx.lineTo(cx + halfLen, cy - gap);
        ctx.stroke();

        // 下边水平线
        ctx.beginPath();
        ctx.moveTo(cx - halfLen, cy + gap);
        ctx.lineTo(cx + halfLen, cy + gap);
        ctx.stroke();

        // 竖向中心刻度（仅两端极短竖线，不遮挡视野）
        const tickH = 3;
        ctx.beginPath();
        ctx.moveTo(cx - halfLen, cy - gap);
        ctx.lineTo(cx - halfLen, cy - gap - tickH);
        ctx.moveTo(cx + halfLen, cy - gap);
        ctx.lineTo(cx + halfLen, cy - gap - tickH);
        ctx.moveTo(cx - halfLen, cy + gap);
        ctx.lineTo(cx - halfLen, cy + gap + tickH);
        ctx.moveTo(cx + halfLen, cy + gap);
        ctx.lineTo(cx + halfLen, cy + gap + tickH);
        ctx.stroke();

        // 中心点（就绪时发光，充能时正常）
        ctx.shadowBlur = this.spreadAmount < 0.15 ? 12 : 0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, PI2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    /**
     * 电弧分支（ArcEmitter / FocusedArcEmitter）：
     * 弧形准星 — 四个 90° 缺口弧段 + 中心圆点，体现范围辐射感。
     * 扩散时弧段张开（radius 增大），冷却就绪时收拢并发光。
     */
    private renderArc(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const ptr = client.input.getScreenPointer();
        const cx = ptr.x + this.recoilX;
        const cy = ptr.y + this.recoilY;

        const radius = 10 + this.spreadAmount * 8;
        const color = this.weaponColor;
        const glow = this.spreadAmount < 0.15;

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow ? 12 : 4;

        // 四段 70° 弧（每段中心对齐上/下/左/右，两侧各留 20° 缺口）
        const gapAngle = Math.PI / 9; // 20°
        const arcSpan = Math.PI / 2 - gapAngle * 2;

        for (let i = 0; i < 4; i++) {
            const center = i * HALF_PI; // 0°, 90°, 180°, 270°
            ctx.beginPath();
            ctx.arc(cx, cy, radius, center + gapAngle, center + gapAngle + arcSpan);
            ctx.stroke();
        }

        // 中心圆点
        ctx.shadowBlur = glow ? 14 : 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, PI2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }
}
