import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";

export class TechAdLoading implements ApplyTech {
    public apply(_player: ServerPlayerEntity) {
    }

    public remove(_player: ServerPlayerEntity) {
    }
}
