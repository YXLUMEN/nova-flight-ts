import {TrackedData} from "./TrackedData.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";

export interface TrackedDataHandler<T> {
    codec(): PacketCodec<T>;

    createData(id: number): TrackedData<T>;
}
