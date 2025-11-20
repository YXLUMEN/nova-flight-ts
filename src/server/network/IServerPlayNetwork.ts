import type {Payload} from "../../network/Payload.ts";
import type {UUID} from "../../apis/types.ts";
import type {Channel} from "../../network/Channel.ts";

export interface IServerPlayNetwork extends Channel {
    sendTo<T extends Payload>(payload: T, target: UUID): void;

    sendExclude<T extends Payload>(payload: T, ...excludes: UUID[]): void;
}