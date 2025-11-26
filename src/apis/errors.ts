import type {CommandNotifyCategory} from "../client/command/ClientCommandManager.ts";

export class IllegalArgumentError extends Error {
}

export class IllegalStateException extends Error {
}

export class CommandError extends Error {
    public readonly category: CommandNotifyCategory;

    public constructor(message: string, category: CommandNotifyCategory = 'error') {
        super(message);
        this.category = category;
    }
}

export class PacketTooLargeError extends Error {
}

export class MediaWithoutSrc extends Error {
}