import type {Identifier} from "../../registry/Identifier.ts";

// @ts-ignore 单纯泛型
export class RecordType<T> {
    public constructor(
        public readonly id: Identifier
    ) {
    }

    public toString() {
        return this.id.toString();
    }
}
