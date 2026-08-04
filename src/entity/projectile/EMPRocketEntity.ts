import {RocketEntity} from "./RocketEntity.ts";
import {Emp} from "../../world/element/Emp.ts";

export class EMPRocketEntity extends RocketEntity {
    public override explosionRadius = 160;
    public override color = "#4b8bff";
    private duration = 300;

    public override explode() {
        this.getWorld().applyElement(Emp.create(
            this.getOwner(),
            this.positionRef,
            this.explosionRadius * 2,
            this.duration,
            1
        ));
    }
}