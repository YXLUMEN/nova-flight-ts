import {clamp, HALF_PI, lerp, PI2} from "../../../utils/math/math.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ItemStack} from "../../../item/ItemStack.ts";
import {Weapon} from "../../../item/weapon/Weapon.ts";
import {BaseWeapon} from "../../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {RocketLauncher} from "../../../item/weapon/BaseWeapon/RocketLauncher.ts";
import {ParticleLance} from "../../../item/weapon/BaseWeapon/ParticleLance.ts";
import {ArcEmitter} from "../../../item/weapon/BaseWeapon/ArcEmitter.ts";
import {FocusedArcEmitter} from "../../../item/weapon/BaseWeapon/FocusedArcEmitter.ts";
import {CIWS} from "../../../item/weapon/BaseWeapon/CIWS.ts";
import {MiniGun} from "../../../item/weapon/BaseWeapon/MiniGun.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import type {ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";
import {config} from "../../../utils/uit.ts";
import {WorldConfig} from "../../../configs/WorldConfig.ts";

export const CrosshairType = config({
    DEFAULT: 0,
    BASE_WEAPON: 1,
    MISSILE: 2,
    LANCE: 3,
    ARC: 4,
    CIWS: 5,
    MINIGUN: 6
})

export type CrosshairTypeValue = typeof CrosshairType[keyof typeof CrosshairType];

export class Crosshair {
    private reloading = false;

    private spreadAmount: number = 0;
    private maxSpread: number = 0;
    private recoilX: number = 0;
    private recoilY: number = 0;
    private recoilPeak: number = 0;

    private crosshairType: CrosshairTypeValue = CrosshairType.DEFAULT;
    private weaponColor: string = '#fff';

    private prevCooldownRatio: number = 1;
    public displayRatio: number = 0;

    // 光矛充能进度插值（0=未充能, 1=充能满）
    private chargeT: number = 0;

    // 机枪扩散归一化插值（0=精准, 1=最散；越打越小）
    private minigunSpreadT: number = 1;

    private static readonly RECOIL_DECAY = 0.82;
    private static readonly SPREAD_LERP = 0.12;

    public tick(player: ClientPlayerEntity) {
        const stack = player.getCurrentItem();
        const item = stack.getItem();

        if (stack.isEmpty() || !(item instanceof Weapon)) {
            this.crosshairType = CrosshairType.DEFAULT;
            this.spreadAmount = 0;
            this.reloading = false;
            return false;
        }

        this.detectWeaponType(item, stack);
    }

    public update(player: ClientPlayerEntity, stack: ItemStack, item: Weapon, tickDelta: number): void {
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

        if (!this.reloading && WorldConfig.crosshairRecoil) {
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
    }

    public render(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        if (client.isPause()) return;

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
            case CrosshairType.CIWS:
                this.renderCIWS(ctx, client);
                break;
            case CrosshairType.MINIGUN:
                this.renderMiniGun(ctx, client);
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
            this.maxSpread = item.getMaxSpread(stack);
        } else if (item instanceof ParticleLance) {
            this.crosshairType = CrosshairType.LANCE;
            this.weaponColor = item.getUiColor();
            this.maxSpread = item.getMaxSpread(stack);

            const rawChargeT = stack.getOrDefault(DataComponents.CHARGING_PROGRESS, 0) / ParticleLance.CHARGING_TIME;
            this.chargeT += (rawChargeT - this.chargeT) * 0.18;
        } else if (item instanceof CIWS) {
            this.crosshairType = CrosshairType.CIWS;
            this.weaponColor = item.getUiColor(stack);
            this.maxSpread = item.getMaxSpread();
        } else if (item instanceof MiniGun) {
            this.crosshairType = CrosshairType.MINIGUN;
            this.weaponColor = item.getUiColor();
            this.maxSpread = item.getMaxSpread(stack);

            const rawSpreadT = clamp((item.getMaxSpread(stack) - 0.5) / 3.5, 0, 1);
            this.minigunSpreadT += (rawSpreadT - this.minigunSpreadT) * 0.12;
        } else if (item instanceof BaseWeapon) {
            this.crosshairType = CrosshairType.BASE_WEAPON;
            this.weaponColor = item.getUiColor(stack);
            this.maxSpread = item.getMaxSpread(stack);
        } else {
            this.crosshairType = CrosshairType.DEFAULT;
            this.weaponColor = '#fff';
            this.maxSpread = 0;
            this.chargeT = 0;
            this.minigunSpreadT = 1;
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

    private renderLance(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const ptr = client.input.getScreenPointer();
        const cx = ptr.x + this.recoilX;
        const cy = ptr.y + this.recoilY;

        const c = this.chargeT;
        const s = this.spreadAmount;
        const color = this.weaponColor;

        const readyGlow = s < 0.12 && c < 0.05;

        // gap：充能时收窄（9→3），冷却时扩大（3→10）
        const gapCharge = lerp(c, 9, 3);
        const gap = lerp(s, gapCharge, 10);

        // halfLen：充能时延长（12→18），冷却时缩短至8
        const halfLenCharge = lerp(c, 12, 18);
        const halfLen = lerp(s, halfLenCharge, 8);

        // lineWidth：充能时加粗（1.5→2.5），冷却时变细（1.0）
        const lwCharge = lerp(c, 1.5, 2.5);
        const lw = lerp(s, lwCharge, 1.0);

        // shadowBlur：充能渐强（4→16），就绪峰值18，冷却衰减至2
        const blurCharge = lerp(c, 4, 16);
        const shadowBlur = readyGlow ? 18 : lerp(s, blurCharge, 2);

        const tickH = 2 + c * 2;

        ctx.lineWidth = lw;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = shadowBlur;

        ctx.beginPath();
        // 左
        ctx.moveTo(cx - gap - halfLen, cy - tickH);
        ctx.lineTo(cx - gap - halfLen, cy + tickH);
        ctx.moveTo(cx - gap, cy);
        ctx.lineTo(cx - gap - halfLen, cy);
        // 右
        ctx.moveTo(cx + gap + halfLen, cy - tickH);
        ctx.lineTo(cx + gap + halfLen, cy + tickH);
        ctx.moveTo(cx + gap, cy);
        ctx.lineTo(cx + gap + halfLen, cy);
        ctx.stroke();

        // 中心圆点：充能完成/就绪态时扩大并高亮
        const dotRadius = 1.5 + c * 0.8;
        ctx.shadowBlur = (readyGlow || c > 0.8) ? 14 : (shadowBlur * 0.6);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, dotRadius, 0, PI2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    private renderCIWS(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const ptr = client.input.getScreenPointer();
        const cx = ptr.x + this.recoilX;
        const cy = ptr.y + this.recoilY;

        const color = this.weaponColor;
        const heatRatio = 1 - this.displayRatio;
        const overheatT = clamp((heatRatio - 0.70) / 0.15, 0, 1);

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, PI2);
        ctx.stroke();

        if (heatRatio > 1E-3) {
            const g = Math.round(252 * (1 - overheatT));
            const b = Math.round(224 * (1 - overheatT));
            const arcColor = overheatT > 0 ? `rgb(${255},${g},${b})` : color;

            ctx.fillStyle = arcColor;
            ctx.shadowColor = arcColor;
            ctx.shadowBlur = overheatT > 0 ? 10 : 4;

            const totalDots = 20;
            const visibleDots = Math.max(1, Math.round(heatRatio * totalDots));
            const angleStep = PI2 / totalDots;

            ctx.beginPath();
            for (let i = 0; i < visibleDots; i++) {
                const angle = -HALF_PI + i * angleStep;
                const px = cx + Math.cos(angle) * 14;
                const py = cy + Math.sin(angle) * 14;
                ctx.moveTo(px + 1.2, py + 1.2);
                ctx.arc(px, py, 1.2, 0, PI2);
            }
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, PI2);
        ctx.fill();
        ctx.lineWidth = 1;
    }

    private renderMiniGun(ctx: CanvasRenderingContext2D, client: NovaFlightClient): void {
        const ptr = client.input.getScreenPointer();
        const cx = ptr.x + this.recoilX;
        const cy = ptr.y + this.recoilY;

        const t = this.minigunSpreadT;
        const color = this.weaponColor;

        const preciseGlow = t < 0.08;

        // 准星半径
        const radius = lerp(t, 10, 32);

        // 弧段间隔角,最散时 30°间隔（弧段=60°），精准时 3°间隔（弧段=87°，近满圆）
        const gapAngle = lerp(t, Math.PI / 60, Math.PI / 6); // 3°→30°
        const arcSpan = HALF_PI - gapAngle * 2;              // 每段弧长

        const lw = lerp(t, 2.0, 1.2);
        const shadowBlur = preciseGlow ? 14 : lerp(t, 6, 3);

        ctx.lineWidth = lw;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = shadowBlur;

        for (let i = 0; i < 4; i++) {
            const center = i * HALF_PI;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, center + gapAngle, center + gapAngle + arcSpan);
            ctx.stroke();
        }

        ctx.shadowBlur = preciseGlow ? 16 : shadowBlur * 0.5;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, PI2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

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
        const arcSpan = HALF_PI - gapAngle * 2;

        for (let i = 0; i < 4; i++) {
            const center = i * HALF_PI;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, center + gapAngle, center + gapAngle + arcSpan);
            ctx.stroke();
        }

        ctx.shadowBlur = glow ? 14 : 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, PI2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }
}
