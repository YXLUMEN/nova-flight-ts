import {CommandManager} from "../command/CommandManager.ts";
import {musicRegistry} from "../command/MusicCommand.ts";
import {devModCommand} from "../command/DevModCommand.ts";
import type {ClientCommandSource} from "./command/ClientCommandSource.ts";
import type {Consumer} from "../apis/types.ts";

export class ClientCommand extends CommandManager {
    private readonly source: ClientCommandSource;
    private readonly usedCommands: string[] = [];
    private historyIndex = -1;

    public constructor(source: ClientCommandSource, callback: Consumer<Error[]>) {
        super(callback);
        this.source = source;

        const commandBar = document.getElementById('command-bar')!;
        const commandInput = document.getElementById('command-input') as HTMLInputElement;

        commandBar.addEventListener('keydown', event => {
            if (event.code === 'Enter' && commandInput.value.length > 0) {
                const value = commandInput.value;
                this.executeCommand(value);

                this.usedCommands.push(value);
                if (this.usedCommands.length > 64) {
                    this.usedCommands.shift();
                }

                this.historyIndex = -1;
                commandInput.value = '';
                return;
            }

            if (event.code === 'ArrowUp' && this.usedCommands.length > 0) {
                if (this.historyIndex === -1) {
                    this.historyIndex = this.usedCommands.length - 1;
                } else if (this.historyIndex > 0) {
                    this.historyIndex--;
                }
                commandInput.value = this.usedCommands[this.historyIndex];
                event.preventDefault();
                return;
            }

            if (event.code === 'ArrowDown' && this.usedCommands.length > 0) {
                if (this.historyIndex >= 0 && this.historyIndex < this.usedCommands.length - 1) {
                    this.historyIndex++;
                    commandInput.value = this.usedCommands[this.historyIndex];
                } else {
                    this.historyIndex = -1;
                    commandInput.value = '';
                }
                event.preventDefault();
                return;
            }
        });
    }

    public override registry(): void {
        musicRegistry(this.dispatcher);
        devModCommand(this.dispatcher);
    }

    private executeCommand(command: string) {
        // @ts-ignore
        this.executeWithPrefix(this.source, command);
    }
}