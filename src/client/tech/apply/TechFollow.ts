import type {ClientApplyTech} from "../ClientApplyTech.ts";
import type {LocalPlayerEntity} from "../../entity/LocalPlayerEntity.ts";

export class TechFollow implements ClientApplyTech {
    public apply(player: LocalPlayerEntity): void {
        player.followPointer = true;
    }

    public remove(player: LocalPlayerEntity): void {
        player.followPointer = false;
    }
}