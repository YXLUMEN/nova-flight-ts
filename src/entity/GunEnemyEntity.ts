import {MobEntity} from "./MobEntity.ts";
import {Vec2} from "../math/Vec2.ts";
import {BulletGun} from "../weapon/BulletGun.ts";

export class GunEnemyEntity extends MobEntity {
    public override speed = 80;
    private readonly gun: BulletGun;

    constructor(pos: Vec2) {
        super(pos, 16, 2, 5);
        this.gun = new BulletGun(this);
    }

    public override update(dt: number) {
        super.update(dt);

        this.gun.tryFire();
    }

    public override render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(this.pos.x, this.pos.y, 20, 20);
        ctx.restore();
    }
}