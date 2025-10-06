import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {TrackedData} from "./TrackedData.ts";

export interface TrackedDataHandler<T> {
    codec(): PacketCodec<T>;

    createData(id: number): TrackedData<T>;
}

export function createTrackDataHandler<T>(codec: PacketCodec<T>): TrackedDataHandler<T> {
    return {
        codec: () => codec,
        createData(id: number): TrackedData<T> {
            return new TrackedData(id, this);
        }
    }
}