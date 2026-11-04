import {traverse_dir_cmd} from "../../client/ipc/fs.ts";
import {DataRecord} from "./DataRecord.ts";

export class TraversPathRecord extends DataRecord<string[]> {
    protected async doLoad(): Promise<string[]> {
        const result = await traverse_dir_cmd(this.url);
        return result.unwrap().files;
    }
}

