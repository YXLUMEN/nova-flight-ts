import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";

export interface ApplyTech {
    apply(player: ServerPlayerEntity): void;

    remove(player: ServerPlayerEntity): void;
}