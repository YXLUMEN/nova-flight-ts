import type {ClientApplyTech} from "../ClientApplyTech.ts";
import {type ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";
import {AutoAim} from "../AutoAim.ts";

export class TechFireCC implements ClientApplyTech {
    public apply(player: ClientPlayerEntity) {
        player.autoAim = new AutoAim(player);
    }

    public remove(player: ClientPlayerEntity) {
        player.autoAim = null;
    }
}