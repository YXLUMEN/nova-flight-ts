import type {ClientApplyTech} from "../ClientApplyTech.ts";
import {type ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";

export class TechSteeringGear implements ClientApplyTech {
    public apply(player: ClientPlayerEntity) {
        player.steeringGear = true;
    }

    public remove(player: ClientPlayerEntity) {
        player.steeringGear = false;
        player.setYaw(-1.57079);
    }
}