import type {LivingEntity} from "./LivingEntity.ts";

export interface IOwnable {
    getOwner(): LivingEntity | null;
}