import type {Payload} from "../../network/Payload.ts";
import type {Channel} from "../../network/Channel.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {BiConsumer, UUID} from "../../apis/types.ts";

export interface ServerChannel extends Channel {
    getSessionId(): number;

    setServerAddress(address: string): void;

    sendTo<T extends Payload>(payload: T, target: GameProfile): void;

    sendToByUUID<T extends Payload>(payload: T, target: UUID): void;

    sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void;

    setHandler(handler: BiConsumer<number, Payload>): void;
}