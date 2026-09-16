import type {ClientApplyTech} from "../ClientApplyTech.ts";
import {type LocalPlayerEntity} from "../../entity/LocalPlayerEntity.ts";
import {BallisticCalculator} from "../BallisticCalculator.ts";

export class TechBC implements ClientApplyTech {
    public apply(player: LocalPlayerEntity) {
        player.bc = new BallisticCalculator(player);
    }

    public remove(player: LocalPlayerEntity) {
        player.bc = null;
    }
}