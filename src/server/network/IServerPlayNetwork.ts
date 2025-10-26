import type {Payload} from "../../network/Payload.ts";
import type {UUID} from "../../apis/types.ts";
import type {INetworkChannel} from "../../network/INetworkChannel.ts";

export interface IServerPlayNetwork extends INetworkChannel {
    sendTo<T extends Payload>(payload: T, target: UUID): void;

    sendExclude<T extends Payload>(payload: T, ...excludes: UUID[]): void;
}