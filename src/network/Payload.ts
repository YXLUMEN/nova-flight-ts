import type {Identifier} from "../registry/Identifier.ts";

// @ts-ignore
export interface PayloadId<T extends Payload> {
    id: Identifier;
}

export interface Payload {
    getId(): PayloadId<any>;
}

