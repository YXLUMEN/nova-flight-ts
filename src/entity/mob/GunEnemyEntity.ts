import {MobEntity} from "../MobEntity.ts";
import {Vec2} from "../../math/Vec2.ts";
import {Cannon40Weapon} from "../../weapon/Cannon40Weapon.ts";
import type {World} from "../../World.ts";

export class GunEnemyEntity extends MobEntity {
    public override speed = 80;
    private readonly gun: Cannon40Weapon;

    constructor(pos: Vec2) {
        super(pos, 16, 2, 5);
        this.gun = new Cannon40Weapon(this);
    }

    public override update(world: World, dt: number) {
        super.update(world, dt);

        this.gun.tryFire();
    }

    public override render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(this.pos.x, this.pos.y, 20, 20);
        ctx.restore();
    }
}