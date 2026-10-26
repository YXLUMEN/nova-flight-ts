import type {ClientWorld} from "../../client/ClientWorld.ts";
import type {VisualEffect} from "../VisualEffect.ts";
import type {VisualEffectType} from "../VisualEffectType.ts";
import {randInt} from "../../utils/math/math.ts";
import {MutAABB} from "../../utils/math/MutAABB.ts";
import type {ViewRect} from "../../client/render/Camera.ts";
import {isBoxInView} from "../../utils/render/render.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

/**
 * 用于行为复杂的粒子,但永远推荐先使用 `ParticlePool`
 * @see {ParticlePool}
 * */
export abstract class Particle implements VisualEffect {
    protected readonly world: ClientWorld;
    protected readonly box: MutAABB = new MutAABB(0, 0, 0, 0);

    protected x: number;
    protected y: number;
    protected px: number;
    protected py: number;

    protected vx: number = 0;
    protected vy: number = 0;
    protected hasPhysics: boolean = true;
    protected halfW: number = 1.0;
    protected halfH: number = 1.0;

    protected age: number = 0;
    protected lifeTick: number;
    protected friction: number = 0.98;

    protected constructor(world: ClientWorld, x: number, y: number, lifeTick?: number) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.px = x;
        this.py = y;
        this.lifeTick = lifeTick ? lifeTick : randInt(10, 20);
    }

    public abstract getType(): VisualEffectType<Particle>;

    public tick() {
        this.px = this.x;
        this.py = this.y;
        this.age++;

        this.vx = this.vx * this.friction;
        this.vy = this.vy * this.friction;
        this.move(this.vx, this.vy);
    }

    public abstract render(ctx: CanvasRenderingContext2D, alpha: number): void;

    public shouldRender(view: ViewRect): boolean {
        return isBoxInView(this.box, view);
    }

    public isAlive(): boolean {
        return this.age < this.lifeTick;
    }

    public kill() {
        this.age = this.lifeTick;
    }

    protected setSize(hw: number, hh: number) {
        if (this.halfW === hw && this.halfH === hh) return;
        this.halfW = hw;
        this.halfH = hh;
        this.box.toCenter(this.x, this.y, hw, hh);
    }

    public setPos(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.box.toCenter(this.x, this.y, this.halfW, this.halfH);
    }

    public move(vx: number, vy: number) {
        if (vx === 0 && vy === 0) return;

        const ox = vx;
        const oy = vy;
        if (this.hasPhysics) {
            const movement = BlockCollision.separatingCollision(this.world.getMap(), this.box, new MutVec2(vx, vy));
            vx = movement.x;
            vy = movement.y;
        }

        this.box.offset(vx, vy);

        if (ox != vx) this.vx = 0;
        if (oy != vy) this.vy = 0;
    }
}