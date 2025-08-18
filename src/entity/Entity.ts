import {type MutVec2} from "../math/MutVec2.ts";
import {type Status} from "../status/Status.ts";
import {type World} from "../World.ts";
import {Vec2} from "../math/Vec2.ts";

export abstract class Entity {
    private readonly _pos: MutVec2;
    private readonly _boxRadius: number;

    public speed: number = 0;

    private statuses: Status[] = [];

    protected dead: boolean;

    protected constructor(pos: MutVec2, boxRadius: number) {
        this._pos = pos;
        this._boxRadius = boxRadius;
        this.dead = false;
    }

    public update(world: World, dt: number): void {
        this.updateStatuses(world, dt);
    };

    public addStatus(status: Status) {
        this.statuses.push(status);
    }

    public updateStatuses(world: World, dt: number) {
        for (const s of this.statuses) {
            s.update(world, this, dt);
        }
        this.statuses = this.statuses.filter(s => !s.expired);
    }

    public hasStatus(tag: string): boolean {
        return this.statuses.some(s => s.getTag() === tag);
    }

    public getStatus(tag: string): Status | undefined {
        return this.statuses.find(s => s.getTag() === tag);
    }

    public onDeath(_world: World): void {
        this.dead = true;
    }

    public get isDead(): boolean {
        return this.dead;
    }

    public get pos(): MutVec2 {
        return this._pos;
    }

    public getPos(): Vec2 {
        return Vec2.formVec(this._pos);
    }

    public get boxRadius(): number {
        return this._boxRadius;
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;
}