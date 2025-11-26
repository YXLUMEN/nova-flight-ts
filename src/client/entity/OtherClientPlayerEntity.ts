import type {World} from "../../world/World.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import type {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {AbstractClientPlayerEntity} from "./AbstractClientPlayerEntity.ts";
import {ItemCooldownManager} from "../../item/ItemCooldownManager.ts";

export class OtherClientPlayerEntity extends AbstractClientPlayerEntity {
    private readonly clientVelocity = MutVec2.zero();
    private velocityLerpDivisor: number = 0;

    public constructor(world: World) {
        super(world, new ItemCooldownManager());
    }

    protected override tickInventory() {
    }

    public override takeDamage(): boolean {
        return true;
    }

    public override tickMovement() {
        if (this.bodyTrackingIncrements > 0) {
            this.lerpPosAndRotation(this.bodyTrackingIncrements, this.serverX, this.serverY, this.serverYaw);
            this.bodyTrackingIncrements--;
        }

        if (this.velocityLerpDivisor > 0) {
            const velocity = this.getVelocityRef;
            const vx = (this.clientVelocity.x - velocity.x) / this.velocityLerpDivisor;
            const vy = (this.clientVelocity.y - velocity.y) / this.velocityLerpDivisor;
            velocity.add(vx, vy).multiply(0.9);

            this.velocityLerpDivisor--;
        }
    }

    public override setVelocityClient(x: number, y: number) {
        this.clientVelocity.set(x, y);
        this.velocityLerpDivisor = this.getType().getTrackingTickInterval() + 1;
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        super.onSpawnPacket(packet);
        this.resetPosition();
    }
}