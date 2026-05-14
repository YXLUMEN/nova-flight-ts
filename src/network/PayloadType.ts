import {Identifier} from "../registry/Identifier.ts";
import type {Payload} from "./Payload.ts";
import {config} from "../utils/uit.ts";

// @ts-ignore
export interface PayloadType<T extends Payload> {
    id: Identifier;
}

export function payloadType<T extends Payload>(name: string): PayloadType<T> {
    return config({id: Identifier.ofVanilla(name)});
}