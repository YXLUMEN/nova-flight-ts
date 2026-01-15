import {RocketEntity} from "./RocketEntity.ts";

export class EMPRocketEntity extends RocketEntity {
    public override explosionRadius = 160;
    public override color = "#4b8bff";
    private duration = 300;

    public override explode() {
        this.getWorld().createEMP(
            this.getOwner(),
            this.getPositionRef,
            this.explosionRadius * 2,
            this.duration
        );
    }
}