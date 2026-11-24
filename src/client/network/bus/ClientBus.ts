import type {NetWorkBus} from "../../../network/NetWorkBus.ts";
import type {Channel} from "../../../network/channel/Channel.ts";

export interface ClientBus extends NetWorkBus {
    setChannel(channel: Channel): void;

    /**
     * 同步发送数据帧,与 `Egress` 相同
     * @see {Egress}
     * */
    sendFrame(frame: Uint8Array<ArrayBuffer>): void;
}