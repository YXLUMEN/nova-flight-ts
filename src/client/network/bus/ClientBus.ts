import type {NetWorkBus} from "../../../network/NetWorkBus.ts";
import type {Channel} from "../../../network/channel/Channel.ts";

export interface ClientBus extends NetWorkBus {
    setChannel(channel: Channel): void;

    sendBuffer(buff: Uint8Array<ArrayBuffer>): void;
}