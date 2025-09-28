import {EntityTypes} from "../EntityTypes.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {FuseRocketEntity} from "./FuseRocketEntity.ts";
import {randInt} from "../../utils/math/math.ts";

export class ClusterRocketEntity extends FuseRocketEntity {
    public override color = "#ff5d2a";

    private rocketCounts = 12;

    public override explode() {
        super.explode();

        const world = this.getWorld();
        const yaw = this.getYaw();
        const pos = this.getPositionRef;

        for (let i = this.rocketCounts; i--;) {
            const rocket = new FuseRocketEntity(EntityTypes.ROCKET_ENTITY, world, this.getOwner(), 8, randInt(20, 60));
            rocket.explosionDamage = 6;

            const angleOffset = -Math.PI / 2 + (Math.PI / (this.rocketCounts - 1)) * i;
            const bulletYaw = yaw + angleOffset;

            const dirX = Math.cos(bulletYaw);
            const dirY = Math.sin(bulletYaw);

            rocket.setPosition(
                pos.x + dirX * 10,
                pos.y + dirY * 10
            );
            rocket.setVelocityByVec(new Vec2(dirX * 8, dirY * 8));

            rocket.setYaw(bulletYaw);
            world.spawnEntity(rocket);
        }
    }
}