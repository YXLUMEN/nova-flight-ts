import {CommandManager} from "../command/CommandManager.ts";
import type {ServerCommandSource} from "./command/ServerCommandSource.ts";
import type {Consumer} from "../apis/types.ts";

export class ServerCommand extends CommandManager {
    public readonly source: ServerCommandSource;

    public constructor(source: ServerCommandSource, callback: Consumer<Error[]>) {
        super(callback);
        this.source = source;
    }

    public registry(): void {
    }
}