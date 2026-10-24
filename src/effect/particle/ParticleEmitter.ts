import type {ParticleEffectType} from "./ParticleEffectType.ts";
import type {ClientWorld} from "../../client/ClientWorld.ts";
import type {Entity} from "../../entity/Entity.ts";

export class ParticleEmitter {
    private readonly world: ClientWorld;
    private readonly particle: ParticleEffectType;
    private readonly entity: Entity | null = null;

    private lifeTick: number;
    private x: number;
    private y: number;

    public constructor(
        world: ClientWorld,
        x: number, y: number,
        particle: ParticleEffectType,
        lifeTick: number = 3,
        entity: Entity | null = null,
    ) {
        this.world = world;
        this.particle = particle;
        this.entity = entity;
        this.lifeTick = lifeTick;
        this.x = x;
        this.y = y;
    }

    public tick(): void {
        if (this.entity) {
            this.x = this.entity.getX();
            this.y = this.entity.getY();
        }

        this.world.addParticle(this.particle, this.x, this.y, 1);
        this.lifeTick--;
    }

    public isAlive(): boolean {
        return this.lifeTick > 0;
    }

    public kill(): void {
        this.lifeTick = 0;
    }
}