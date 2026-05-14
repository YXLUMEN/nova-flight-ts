import type {PacketListener} from "./handler/PacketListener.ts";
import type {PayloadType} from "./PayloadType.ts";


export interface Payload {
    type(): PayloadType<any>;

    accept(listener: PacketListener): void;

    /**
     * 估算数据包长度, 尽可能将复杂度控制为 O(1).
     *
     * @return uint 返回的长度**不包含**固定头部
     * */
    estimateSize?(): number;

    canProcessInTransition?(): boolean;
}
