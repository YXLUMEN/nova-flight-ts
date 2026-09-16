import type {LocalPlayerEntity} from "../entity/LocalPlayerEntity.ts";

export interface ClientApplyTech {
    apply(player: LocalPlayerEntity): void;

    remove(player: LocalPlayerEntity): void;
}