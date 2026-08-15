import type {ClientApplyTech} from "../ClientApplyTech.ts";
import type {ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";

export class TechFollow implements ClientApplyTech {
    public apply(player: ClientPlayerEntity): void {
        player.followPointer = true;
    }

    public remove(player: ClientPlayerEntity): void {
        player.followPointer = false;
    }
}