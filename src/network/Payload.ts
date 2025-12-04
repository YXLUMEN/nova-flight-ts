import type {Identifier} from "../registry/Identifier.ts";

// @ts-ignore
export interface PayloadId<T extends Payload> {
    id: Identifier;
}

export interface Payload {
    getId(): PayloadId<any>;

    /**
     * 估算数据包长度, 尽可能将复杂度控制为O(1).
     *
     * @return uint 返回的长度**不包含**固定头部
     * */
    estimateSize?(): number;
}

