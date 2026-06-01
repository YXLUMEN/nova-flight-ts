import type {ClientApplyTech} from "../ClientApplyTech.ts";
import {type ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";
import {BallisticCalculator} from "../BallisticCalculator.ts";

export class TechBC implements ClientApplyTech {
    public apply(player: ClientPlayerEntity) {
        player.bc = new BallisticCalculator(player);
    }

    public remove(player: ClientPlayerEntity) {
        player.bc = null;
    }
}