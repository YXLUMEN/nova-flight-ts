import type {Vec2} from "../math/Vec2.ts";

export abstract class Entity {
    public pos: Vec2;
    public radius: number;
    protected dead: boolean;

    protected constructor(pos: Vec2, radius: number) {
        this.pos = pos;
        this.radius = radius;
        this.dead = false;
    }

    public abstract update(dt: number): void;

    public abstract render(ctx: CanvasRenderingContext2D): void;

    public onDeath(): void {
        this.dead = true;
    }

    get isDead(): boolean {
        return this.dead;
    }
}