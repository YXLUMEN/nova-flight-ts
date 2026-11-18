import type {Channel} from "../../network/channel/Channel.ts";
import type {NetWorkBus} from "../../network/NetWorkBus.ts";

export interface ClientChannel extends Channel, NetWorkBus {
    clearHandler(): void;
}