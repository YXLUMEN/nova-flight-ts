import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {TrackedData} from "./TrackedData.ts";

export interface TrackedDataHandler<T> {
    codec(): PacketCodec<T>;

    createData(id: number): TrackedData<T>;
}
