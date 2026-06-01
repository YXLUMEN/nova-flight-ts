import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";

export interface ClientApplyTech {
    apply(player: ClientPlayerEntity): void;

    remove(player: ClientPlayerEntity): void;
}