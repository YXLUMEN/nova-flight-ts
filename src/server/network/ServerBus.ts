import type {Payload} from "../../network/Payload.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {Egress} from "./Egress.ts";
import type {SessionDispatcher} from "./SessionDispatcher.ts";

export interface ServerBus extends Egress {
    getSessionId(): number;

    setDispatcher(dispatcher: SessionDispatcher): void;

    exclude(payload: Payload, ...excludes: GameProfile[]): void;

    connect(): Promise<void>;

    sniff(): Promise<boolean>;

    flush(): void;

    disconnect(): void;
}
