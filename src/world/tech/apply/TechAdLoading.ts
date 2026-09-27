import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";

/**
 * @deprecated 射速不允许浮点值,此科技将在未来调整
 * */
export class TechAdLoading implements ApplyTech {
    public apply(_player: ServerPlayerEntity) {
    }

    public remove(_player: ServerPlayerEntity) {
    }
}
