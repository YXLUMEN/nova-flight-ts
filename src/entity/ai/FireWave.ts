import {Vec2} from "../../utils/math/Vec2.ts";
import type {Schedule} from "../../type/ITimer.ts";
import type {Supplier} from "../../type/types.ts";
import type {ProjectileEntity} from "../projectile/ProjectileEntity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class FireWave {
    public readonly count: number;
    public readonly speed: number;
    public readonly delay: number;
    public readonly face: boolean;
    public readonly type: number;
    public readonly spread: number;

    public constructor(
        count: number = 1,
        speed: number = 4.5,
        delay: number = 0,
        face: boolean = false,
        type: number = 0,
        spread: number = 0,
    ) {
        this.count = count;
        this.speed = speed;
        this.delay = delay;
        this.face = face;
        this.type = type;
        this.spread = spread;
    }

    public resolveRadius(fromX: number, fromY: number, toX: number, toY: number, fallback: number = 0): number {
        if (this.face) {
            return Math.atan2(toY - fromY, toX - fromX);
        }
        return fallback;
    }

    public resolveRadiusVec(origin: Vec2, target: Vec2, fallback: number = 0): number {
        if (this.face) {
            return Math.atan2(target.y - origin.y, target.x - origin.x);
        }
        return fallback;
    }

    public fireBulletWave(
        world: ServerWorld,
        supplier: Supplier<ProjectileEntity>,
        pos: Vec2,
        startAngle: number,
        endAngle: number,
        predicate?: Supplier<boolean>,
        color: string = '#b10000',
        edgeColor: string = '#ff0000'
    ): Schedule | null {
        const step = (endAngle - startAngle) / Math.max(1, this.count - 1);
        const angles: number[] = [];
        for (let i = 0; i < this.count; i++) {
            angles.push(startAngle + step * i);
        }
        return this.fireAngles(world, supplier, pos, angles, predicate, color, edgeColor);
    }

    public fireBulletWaveD(
        world: ServerWorld,
        supplier: Supplier<ProjectileEntity>,
        x: number, y: number,
        startAngle: number,
        endAngle: number,
        predicate?: Supplier<boolean>,
        color: string = '#b10000',
        edgeColor: string = '#ff0000'
    ): void {
        const step = (endAngle - startAngle) / Math.max(1, this.count - 1);
        for (let i = 0; i < this.count; i++) {
            if (predicate && !predicate()) continue;
            const projectile = supplier();
            const angle = startAngle + step * i;
            projectile.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
            projectile.setPosition(x, y);
            projectile.color = color;
            projectile.edgeColor = edgeColor;
            world.spawnEntity(projectile);
        }
    }

    public fireWithSpread(
        world: ServerWorld,
        supplier: Supplier<ProjectileEntity>,
        pos: Vec2,
        centerAngle: number,
        predicate?: Supplier<boolean>,
        color: string = '#b10000',
        edgeColor: string = '#ff0000'
    ): Schedule | null {
        const angles = this.spreadAngles(this.count, centerAngle, this.spread);
        return this.fireAngles(world, supplier, pos, angles, predicate, color, edgeColor);
    }

    private fireAngles(
        world: ServerWorld,
        supplier: Supplier<ProjectileEntity>,
        pos: Vec2,
        angles: number[],
        predicate?: Supplier<boolean>,
        color: string = '#b10000',
        edgeColor: string = '#ff0000'
    ): Schedule | null {
        const execute = () => {
            if (predicate && !predicate()) return;
            for (const angle of angles) {
                const projectile = supplier();
                projectile.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
                projectile.setPosition(pos.x, pos.y);
                projectile.color = color;
                projectile.edgeColor = edgeColor;
                world.spawnEntity(projectile);
            }
        };

        if (this.delay > 0) {
            return world.schedule(this.delay, execute);
        }
        execute();
        return null;
    }

    private spreadAngles(count: number, centerAngle: number, arcRad: number): number[] {
        const result: number[] = [];
        const step = count <= 1 ? 0 : arcRad / (count - 1);
        for (let i = 0; i < count; i++) {
            result.push(centerAngle - arcRad / 2 + step * i);
        }
        return result;
    }
}