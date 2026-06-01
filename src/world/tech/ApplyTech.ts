import type {ServerPlayerEntity} from "../../server/entity/ServerPlayerEntity.ts";

export interface ApplyTech {
    apply(player: ServerPlayerEntity): void;

    remove(player: ServerPlayerEntity): void;
}