import type {ClientApplyTech} from "../ClientApplyTech.ts";
import {type LocalPlayerEntity} from "../../entity/LocalPlayerEntity.ts";
import {AutoAim} from "../AutoAim.ts";

export class TechFireCC implements ClientApplyTech {
    public apply(player: LocalPlayerEntity) {
        player.autoAim = new AutoAim(player);
    }

    public remove(player: LocalPlayerEntity) {
        player.autoAim = null;
    }
}