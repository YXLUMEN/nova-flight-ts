import type {ClientApplyTech} from "../ClientApplyTech.ts";
import {type LocalPlayerEntity} from "../../entity/LocalPlayerEntity.ts";

export class TechSteeringGear implements ClientApplyTech {
    public apply(player: LocalPlayerEntity) {
        player.steeringGear = true;
    }

    public remove(player: LocalPlayerEntity) {
        player.steeringGear = false;
        player.setYaw(-1.57079);
    }
}