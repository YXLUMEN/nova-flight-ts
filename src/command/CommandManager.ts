import {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ParseResults} from "../brigadier/ParseResults.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandSource} from "./CommandSource.ts";

export abstract class CommandManager {
    protected readonly dispatcher: CommandDispatcher<ServerCommandSource> = new CommandDispatcher();

    public executeWithPrefix(source: ServerCommandSource, input: string): void {
        const command = input.startsWith("/") ? input.slice(1) : input;
        this.execute(this.dispatcher.parse(command, source), command);
    }

    public execute(parseResults: ParseResults<ServerCommandSource>, command: string): void {
        try {
            const contextBuilder = parseResults.context;

            const context = contextBuilder.build(command);
            const lastNode = context.nodes.at(-1);
            if (!lastNode) {
                // noinspection ExceptionCaughtLocallyJS
                throw Error(`\x1b[31mNo such command: "${command}"`);
            }

            const cmd = lastNode.getCommand();
            if (!cmd) {
                // noinspection ExceptionCaughtLocallyJS
                throw Error(`\x1b[31mCommand "${lastNode.getName()}" is not executable, with command: "${command}"`);
            }
            cmd(context);
        } catch (err) {
            console.error(`Failed to execute command for command "${command}": ${err}`);

            const output = parseResults.context.source.outPut;
            if (!output.shouldTrackOutput() && !output.cannotBeSilenced()) return;

            for (const exception of parseResults.exceptions.values()) {
                output.sendMessage(exception.message);
                console.warn(exception);
            }

            if (err instanceof Error) {
                output.sendMessage(err.message);
            }
        }
    }

    public abstract registry(source: CommandSource): void;
}