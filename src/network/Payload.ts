import type {Identifier} from "../registry/Identifier.ts";

export interface Payload {
    getId(): Identifier;
}

