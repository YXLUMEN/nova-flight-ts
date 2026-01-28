import type {IVec} from "./IVec.ts";
import {wrapRadians} from "./math.ts";
import type {MutVec2} from "./MutVec2.ts";

export class BallisticsUtils {
    public static getLeadYaw(shooterPos: IVec, targetPos: IVec, targetVel: IVec, bulletSpeed: number): number {
        const dx = targetPos.x - shooterPos.x;
        const dy = targetPos.y - shooterPos.y;
        const vx = targetVel.x;
        const vy = targetVel.y;

        const a = vx * vx + vy * vy - bulletSpeed * bulletSpeed;
        const b = 2 * (dx * vx + dy * vy);
        const c = dx * dx + dy * dy;

        let t: number;

        if (Math.abs(a) < 1e-6) {
            if (Math.abs(b) < 1e-6) return Math.atan2(dy, dx);
            // 退化为线性方程
            t = -c / b;
        } else {
            const disc = b * b - 4 * a * c;
            if (disc < 0) return Math.atan2(dy, dx); // 无解, 直接瞄准当前
            const sqrtDisc = Math.sqrt(disc);
            const t1 = (-b - sqrtDisc) / (2 * a);
            const t2 = (-b + sqrtDisc) / (2 * a);
            // 取最小正时间
            t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
        }

        if (t <= 0) return Math.atan2(dy, dx);

        const leadX = targetPos.x + vx * t;
        const leadY = targetPos.y + vy * t;

        return Math.atan2(leadY - shooterPos.y, leadX - shooterPos.x);
    }

    public static isViableThreat(
        threatPos: IVec,
        threatVel: IVec,
        defenderPos: IVec,
    ): boolean {
        const velSq = threatVel.x * threatVel.x + threatVel.y * threatVel.y;
        if (velSq < 1e-6) return false; // 静止目标不构成紧急威胁

        const toDefenderX = -(threatPos.x - defenderPos.x);
        const toDefenderY = -(threatPos.y - defenderPos.y);

        const dot = threatVel.x * toDefenderX + threatVel.y * toDefenderY;
        if (dot <= 0) return false; // 远离或垂直

        // 到达最近点的时间
        return dot / velSq >= 0;
    }

    public static isViableThreatRelative(
        threatPos: IVec,
        threatVel: IVec,
        defenderPos: IVec,
        defenderVel: IVec,
    ): boolean {
        const relPosX = threatPos.x - defenderPos.x;
        const relPosY = threatPos.y - defenderPos.y;

        const relVelX = threatVel.x - defenderVel.x;
        const relVelY = threatVel.y - defenderVel.y;

        const relPosSq = relPosX * relPosX + relPosY * relPosY;
        if (relPosSq < 1e-6) return true;

        const relVelSq = relVelX * relVelX + relVelY * relVelY;
        if (relVelSq < 1e-6) return false; // 相对静止

        return relVelX * relPosX + relVelY * relPosY < 0;
    }

    public static guidedIntercept(
        shooterPos: MutVec2,
        targetPos: MutVec2,
        targetVel: IVec,
        missileSpeed: number,
        turnRateLimit: number,
        deltaTime: number,
        maxSteps: number = 20,
        sqHitRadius: number = 36,
    ): number {
        const mp = shooterPos.clone();
        const tp = targetPos.clone();

        const stepSpeed = missileSpeed * deltaTime;
        const maxTurn = turnRateLimit * deltaTime;

        let currentYaw = Math.atan2(tp.y - mp.y, tp.x - mp.x);

        for (let step = 0; step < maxSteps; step++) {
            tp.add(targetVel.x * deltaTime, targetVel.y * deltaTime);

            const desiredYaw = this.getLeadYaw(mp, tp, targetVel, missileSpeed);

            // 限制转向速率
            let deltaYaw = wrapRadians(desiredYaw - currentYaw);

            if (Math.abs(deltaYaw) > maxTurn) {
                deltaYaw = Math.sign(deltaYaw) * maxTurn;
            }
            currentYaw += deltaYaw;

            mp.add(
                Math.cos(currentYaw) * stepSpeed,
                Math.sin(currentYaw) * stepSpeed,
            );

            // 命中判定
            const dx = tp.x - mp.x;
            const dy = tp.y - mp.y;
            if (dx * dx + dy * dy < sqHitRadius) {
                return currentYaw;
            }
        }

        return currentYaw;
    }
}
