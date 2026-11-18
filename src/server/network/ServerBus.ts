import type {Payload} from "../../network/Payload.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {Egress} from "./Egress.ts";
import type {SessionDispatcher} from "./SessionDispatcher.ts";
import type {NetWorkBus} from "../../network/NetWorkBus.ts";

export interface ServerBus extends NetWorkBus, Egress {
    setDispatcher(dispatcher: SessionDispatcher): void;

    exclude(payload: Payload, ...excludes: GameProfile[]): void;

    flush(): void;
}
