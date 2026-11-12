import type {ClientRecordManager} from "./ClientRecordManager.ts";
import {FetchRecord} from "../../database/data/types/FetchRecord.ts";
import {RecordTypes} from "../../database/data/RecordTypes.ts";
import {TraversFilesRecord} from "../../database/data/types/TraversFilesRecord.ts";

export class ClientRecordRegister {
    public static register(data: ClientRecordManager) {
        data.add(RecordTypes.TECH, new FetchRecord('./data/tech/tech-data.json', 'arraybuffer'));
        data.add(RecordTypes.TAGS, new TraversFilesRecord('resources/nova-flight/data/tags'));
    }
}