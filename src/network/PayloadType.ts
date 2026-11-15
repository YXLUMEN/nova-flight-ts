import {Identifier} from "../registry/Identifier.ts";
import type {Payload} from "./Payload.ts";
import type {Comparable} from "../type/Comparable.ts";

// @ts-ignore 忽略未使用的泛型
export class PayloadType<T extends Payload> implements Comparable {
    public readonly id: Identifier;

    public constructor(id: Identifier) {
        this.id = id;
    }

    public hashCode(): number {
        return this.id.hashCode();
    }

    public equals(other: unknown): boolean {
        if (other === this) return true;
        if (other instanceof PayloadType) return this.id.equals(other.id);
        return false;
    }
}

export function payloadType<T extends Payload>(name: string): PayloadType<T> {
    return Object.freeze(new PayloadType<T>(Identifier.ofVanilla(name)));
}