import type {Vec2} from "../math/Vec2.ts";
import type {Status} from "../status/Status.ts";
import {SlowStatus} from "../status/SlowStatus.ts";

export abstract class Entity {
    public pos: Vec2;
    public radius: number;
    public speed: number = 0;
    public speedMul: number = 1;

    private statuses: Status[] = [];

    protected dead: boolean;

    protected constructor(pos: Vec2, radius: number) {
        this.pos = pos;
        this.radius = radius;
        this.dead = false;
    }

    public update(dt: number): void {
        this.updateStatuses(dt);
    };

    public addStatus(status: Status) {
        this.statuses.push(status);
    }

    public updateStatuses(dt: number) {
        for (const s of this.statuses) {
            s.update(this, dt);
        }
        this.statuses = this.statuses.filter(s => !s.expired);
        if (!this.statuses.some(s => s instanceof SlowStatus)) {
            this.speedMul = 1;
        }
    }

    public onDeath(): void {
        this.dead = true;
    }

    get isDead(): boolean {
        return this.dead;
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;
}