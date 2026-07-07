import {Identifier} from "../registry/Identifier.ts";
import type {Payload} from "./Payload.ts";

// @ts-ignore 忽略未使用的泛型
export interface PayloadType<T extends Payload> {
    readonly id: Identifier;
}

export function payloadType<T extends Payload>(name: string): PayloadType<T> {
    return Object.freeze({id: Identifier.ofVanilla(name)});
}