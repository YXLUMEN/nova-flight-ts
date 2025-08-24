import {StatusEffect} from "./StatusEffect.ts";
import type {Entity} from "../entity/Entity.ts";
import type {World} from "../World.ts";
import {PI2} from "../math/math.ts";
import {MutVec2} from "../math/MutVec2.ts";

export class EMCStatus extends StatusEffect {
    private cooldown = 0;
    private readonly interval = 0.05;

    public constructor() {
        super();
    }

    public apply(world: World, entity: Entity, dt: number) {
        this.cooldown -= dt;
        if (this.cooldown > 0) return;
        this.cooldown = this.interval;

        const angle = Math.random() * PI2;
        const pos = entity.pos.add(new MutVec2(Math.cos(angle), Math.sin(angle)).mul(16));

        const speed = 100 + Math.random() * 50;
        const vel = new MutVec2(Math.cos(angle), Math.sin(angle)).mul(speed);

        world.spawnParticle(
            pos, vel,
            0.3,
            1.5,
            '#66ccff', '#0033ff',
            1.5,
            0.0
        );
    }
}