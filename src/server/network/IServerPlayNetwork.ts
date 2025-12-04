import type {Payload} from "../../network/Payload.ts";
import type {Channel} from "../../network/Channel.ts";
import type {GameProfile} from "../entity/GameProfile.ts";

export interface IServerPlayNetwork extends Channel {
    sendTo<T extends Payload>(payload: T, target: GameProfile): void;

    sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void;
}