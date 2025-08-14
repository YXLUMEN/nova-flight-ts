import {Game} from "../Game.ts";
import {Vec2} from "../math/Vec2.ts";
import {MobEntity} from "./MobEntity.ts";
import {Particle} from "../effect/Particle.ts";
import {rand} from "../math/uit.ts";

export class BaseEnemy extends MobEntity {
    public override speed = 110;

    constructor(pos: Vec2) {
        super(pos, 16, 1, 1);
    }

    public override render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        // 机身
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(Math.PI);

        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, 6);
        ctx.lineTo(0, 12);
        ctx.lineTo(-14, 6);
        ctx.closePath();
        ctx.fill();
        // 轮廓
        ctx.strokeStyle = "rgba(0,0,0,.2)";
        ctx.stroke();
        ctx.restore();
    }

    public override onDamage(damage: number) {
        super.onDamage(damage);
        Game.instance.effects.push(new Particle(
            this.pos.clone(), new Vec2(0, 0), rand(0.6, 0.8), rand(4, 6),
            "#ffaa33", "#ff5454", 0.6, 80
        ));
    }

    public override onDeath() {
        super.onDeath();

        const pos = this.pos.clone();
        for (let i = 0; i < 6; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(80, 180);
            const vel = new Vec2(Math.cos(a) * speed, Math.sin(a) * speed);
            Game.instance.effects.push(new Particle(
                pos.clone(), vel, rand(0.6, 0.8), rand(4, 6),
                "#ffaa33", "#ff5454", 0.6, 80
            ));
        }
    }
}