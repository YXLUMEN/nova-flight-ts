import type {ConnectionState} from "../ConnectionState.ts";
import type {NetworkSide} from "../NetworkSide.ts";
import type {Comparable} from "../../type/Comparable.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {hashable, hashObject, hashString} from "../../utils/hash.ts";

export class ProtocolInfo implements Comparable {
    public constructor(
        public readonly protocol: ConnectionState,
        public readonly side: NetworkSide,
        public readonly codec: PacketCodec<any>,
    ) {
    }

    public hashCode(): number {
        let h = this.protocol | 0;
        h = (31 * h + hashString(this.side)) | 0;
        h = (31 * h + hashObject(this.codec)) | 0;
        return h;
    }

    public equals(other: unknown): boolean {
        if (other === this) return true;
        if (!(other instanceof ProtocolInfo)) return false;

        if (other.protocol !== this.protocol || other.side !== this.side) return false;

        if (hashable(other.codec) && hashable(this.codec)) {
            return other.codec.equals(this.codec);
        }

        return other.codec === this.codec;
    }
}