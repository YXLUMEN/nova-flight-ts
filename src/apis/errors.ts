import type {CommandNotifyCategory} from "../client/ClientCommandManager.ts";

export class IllegalArgumentError extends Error {
}

export class CommandError extends Error {
    public readonly category: CommandNotifyCategory;

    public constructor(message: string, category: CommandNotifyCategory = 'error') {
        super(message);
        this.category = category;
    }
}