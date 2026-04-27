import type {Channel} from "../../network/Channel.ts";
import type {Consumer} from "../../type/types.ts";
import type {Payload} from "../../network/Payload.ts";

export interface ClientChannel extends Channel {
    setHandler(handler: Consumer<Payload>): void;

    clearHandlers(): void;

    getSessionId(): number;

    getServerAddress(): string;

    setServerAddress(address: string): void;
}