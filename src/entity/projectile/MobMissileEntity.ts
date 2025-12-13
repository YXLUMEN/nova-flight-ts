import {MissileEntity} from "./MissileEntity.ts";
import {World} from "../../world/World.ts";
import type {EntityType} from "../EntityType.ts";
import type {Entity} from "../Entity.ts";
import {DecoyEntity} from "../DecoyEntity.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {distanceVec2, getNearestEntity} from "../../utils/math/math.ts";

export class MobMissileEntity extends MissileEntity {
    protected override maxReLockCD = 15;
    protected override driftSpeed = 1.4;
    protected override trackingSpeed = 2;

    protected override igniteDelayTicks = 25;
    protected override lockDelayTicks = 40;
    protected override maxLifetimeTicks = 220;

    public constructor(type: EntityType<MobMissileEntity>, world: World, owner: Entity, driftAngle: number) {
        super(type, world, owner, driftAngle, 5);
    }

    public override shouldApplyDecoy(): boolean {
        return (this.age & 7) === 0 && !(this.target instanceof DecoyEntity);
    }

    public override applyDecoy(): void {
        const decoyEntities = DecoyEntity.Entities;
        if (decoyEntities.size <= 0) return
        const rand = Math.random();
        const world = this.getWorld();

        if (rand < 0.2) {
            this.reLockCD = 40;
            world.events.emit(EVENTS.ENTITY_UNLOCKED, {missile: this, lastTarget: this.target});
            this.target = null;
        } else if (rand < 0.8) {
            this.reLockCD = 100;
            world.events.emit(EVENTS.ENTITY_UNLOCKED, {missile: this, lastTarget: this.target});
            let closest = null;
            let minDist = Infinity;

            for (const decoyEntity of decoyEntities) {
                const d = distanceVec2(decoyEntity.getPositionRef, this.getPositionRef);
                if (d < minDist) {
                    minDist = d;
                    closest = decoyEntity;
                }
            }

            this.target = closest;
        }
    }

    protected override acquireTarget(): Entity | null {
        const players = this.getWorld().getPlayers();
        return getNearestEntity(this.getPositionRef, players);
    }

    protected override adjustPosition(): boolean {
        const pos = this.getPositionRef;
        if (pos.y < -20 || pos.y > World.WORLD_H + 20 || pos.x < -20 || pos.x > World.WORLD_W + 20) {
            this.discard();
            return false;
        }
        return true;
    }
}