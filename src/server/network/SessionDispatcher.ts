import type {BinaryReader} from "../../serialization/BinaryReader.ts";

export interface SessionDispatcher {
    dispatch(sid: number, reader: BinaryReader): void;

    relay(reader: BinaryReader): void;
}