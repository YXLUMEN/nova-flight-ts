import {MissileEntity} from "./MissileEntity.ts";
import {World} from "../../world/World.ts";
import type {EntityType} from "../EntityType.ts";
import {type Entity} from "../Entity.ts";
import {DecoyEntity} from "../DecoyEntity.ts";
import {getNearestEntity, squareDistVec2} from "../../utils/math/math.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {BallisticsUtils} from "../../utils/math/BallisticsUtils.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";
import {BehaviourEnum} from "../../world/explosion/ExplosionBehavior.ts";
import {FilterBehaviour} from "../../world/explosion/FilterBehaviour.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import {EntityPredicates} from "../../world/predicate/EntityPredicates.ts";

export class MobMissileEntity extends MissileEntity {
    private static readonly EXPLOSION = new FilterBehaviour(BehaviourEnum.ONLY_DAMAGE)
        .withFiler(EntityPredicates.ONLY_PLAYER);

    protected override maxRelockCooldown = 15;
    protected override driftSpeed = 1.4;
    protected override trackingSpeed = 2;

    protected override igniteDelayTicks = 25;
    protected override lockDelayTicks = 40;
    protected override maxLifetimeTicks = 220;

    protected turnRate = Math.PI / 24;
    protected override behaviour = MobMissileEntity.EXPLOSION;

    public constructor(type: EntityType<MobMissileEntity>, world: World, owner: Entity, driftAngle: number) {
        super(type, world, owner, driftAngle, 5);
    }

    protected override track(movement: IVec) {
        super.move(movement);
    }

    protected override adjustBlockCollision(movement: MutVec2): MutVec2 {
        const map = this.getWorld().getMap();
        const collision = BlockCollision.fastCollision(map, this.getBoundingBox(), movement);
        if (collision) {
            this.discard();
            this.explode();
            return movement.multiply(0);
        }

        return movement;
    }

    protected override predictInterceptYaw(pos: IVec, targetPos: IVec, targetVel: IVec): number {
        return BallisticsUtils.getLeadYaw(pos, targetPos, targetVel, this.trackingSpeed);
    }

    public shouldApplyDecoy(): boolean {
        return (this.age & 7) === 0 && !(this.target instanceof DecoyEntity);
    }

    public override applyDecoy(): void {
        if (!this.shouldApplyDecoy()) return;

        const decoyEntities = DecoyEntity.Entities;
        if (decoyEntities.size <= 0) return
        const rand = Math.random();

        if (rand < 0.2) {
            this.relockCooldown = 40;
            this.target = null;
        } else if (rand < 0.8) {
            this.relockCooldown = 100;
            let closest = null;
            let minDist = Infinity;

            for (const decoyEntity of decoyEntities) {
                const d = squareDistVec2(decoyEntity.positionRef, this.positionRef);
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
        return getNearestEntity(this.positionRef, players);
    }
}