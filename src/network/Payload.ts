import {Identifier} from "../registry/Identifier.ts";
import {config} from "../utils/uit.ts";
import type {PacketListener} from "../server/network/handler/PacketListener.ts";

// @ts-ignore
export interface PayloadId<T extends Payload> {
    id: Identifier;
}

export function payloadId<T extends Payload>(name: string): PayloadId<T> {
    return config({id: Identifier.ofVanilla(name)});
}

export interface Payload {
    getId(): PayloadId<any>;

    accept(listener: PacketListener): void;

    /**
     * 估算数据包长度, 尽可能将复杂度控制为 O(1).
     *
     * @return uint 返回的长度**不包含**固定头部
     * */
    estimateSize?(): number;

    canProcessInTransition?(): boolean;
}

