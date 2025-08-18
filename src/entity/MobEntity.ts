import {LivingEntity} from "./LivingEntity.ts";
import {MutVec2} from "../math/MutVec2.ts";
import {World} from "../World.ts";
import {rand} from "../math/math.ts";
import {EMCStatus} from "../status/EMCStatus.ts";

export abstract class MobEntity extends LivingEntity {
    protected readonly worth: number;
    protected t = Math.random() * 1000;

    protected constructor(pos: MutVec2, radius: number, health: number, worth: number) {
        super(pos, radius, health);
        this.worth = worth;
    }

    public override update(world: World, dt: number) {
        super.update(world, dt);

        const emc = this.getStatus('EMC');
        if (emc instanceof EMCStatus) dt *= emc.factor;

        this.t += dt;
        this.pos.y += this.speed * dt;
        this.pos.x += Math.sin(this.t * 3) * 40 * dt;

        if (this.pos.y > World.H + 40) this.dead = true;
    }

    public override onDamage(world: World, damage: number) {
        super.onDamage(world, damage);

        world.spawnParticle(this.pos, new MutVec2(0, 0), rand(0.6, 0.8), rand(4, 6),
            "#ffaa33", "#ff5454", 0.6, 80);
    }

    public override onDeath(world: World): void {
        super.onDeath(world);

        for (let i = 0; i < 4; i++) {
            const a = rand(0, Math.PI * 2);
            const speed = rand(80, 180);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);

            world.spawnParticle(
                this.pos, vel, rand(0.6, 0.8), rand(4, 6),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public getWorth(): number {
        return this.worth;
    }
}