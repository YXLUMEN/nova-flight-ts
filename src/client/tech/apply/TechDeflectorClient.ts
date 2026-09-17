import type {ClientApplyTech} from "../ClientApplyTech.ts";
import type {LocalPlayerEntity} from "../../entity/LocalPlayerEntity.ts";
import {ShieldAuraEffect} from "../../../effect/ShieldAuraEffect.ts";

export class TechDeflectorClient implements ClientApplyTech {
    public apply(player: LocalPlayerEntity) {
        player.deflector?.kill();

        const radius = player.getDimensions().halfWidth + 8;
        const arua = new ShieldAuraEffect(player.positionRef, radius, 0.1);
        arua.bindEntity = player;

        player.deflector = arua;
        player.getWorld().addEffect(player, arua);
    }

    public remove(player: LocalPlayerEntity) {
        player.deflector?.kill();
        player.deflector = null;
    }
}