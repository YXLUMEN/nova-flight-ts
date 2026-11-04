import type {ServerRecordManager} from "./ServerRecordManager.ts";
import {RecordTypes} from "../../database/data/RecordTypes.ts";

export class ServerRecordRegister {
    public static register(data: ServerRecordManager): void {
        data.ipc(RecordTypes.TECH);
        data.ipc(RecordTypes.TAGS);
    }
}