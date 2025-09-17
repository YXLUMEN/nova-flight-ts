import type {MobEntity} from "../mob/MobEntity.ts";

export abstract class MobAI {
    public abstract updateVelocity(mob: MobEntity): void;
}