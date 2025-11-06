import {CommandManager} from "../command/CommandManager.ts";
import {musicRegistry} from "../command/MusicCommand.ts";
import {devModCommand} from "../command/DevModCommand.ts";
import type {ClientCommandSource} from "./command/ClientCommandSource.ts";
import type {Consumer} from "../apis/types.ts";
import {clientSettingsCommand} from "../command/ClientSettingsCommand.ts";
import {commandBarCommand} from "../command/CommandBarCommand.ts";

export class ClientCommand extends CommandManager {
    private readonly source: ClientCommandSource;
    private readonly usedCommands: string[] = [];
    private readonly commandPanel: HTMLDivElement;

    private hiddenMessages = new Set<number>();
    private historyIndex = -1;

    public constructor(source: ClientCommandSource, callback: Consumer<Error[]>) {
        super(callback);
        this.source = source;

        const commandBar = document.getElementById('command-bar')!;
        const commandInput = document.getElementById('command-input') as HTMLInputElement;
        this.commandPanel = document.getElementById('command-panel') as HTMLDivElement;

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

    public addPlainMessage(msg: string) {
        const div = document.createElement('div');
        div.textContent = msg;
        div.classList.add('notify');
        this.addMessage(div);
    }

    private addMessage(msg: HTMLDivElement) {
        this.commandPanel.append(msg);

        if (this.commandPanel.childElementCount > 64) {
            this.commandPanel.firstChild?.remove();
        }

        if (!this.commandPanel.classList.contains('hidden')) return;

        const timer = setTimeout(() => {
            msg.classList.add('hidden');
            this.hiddenMessages.delete(timer);
        }, 3000);
        this.hiddenMessages.add(timer);
    }

    public addMessageElement(msg: HTMLDivElement) {
        if (!msg.classList.contains('notify')) return;

        if (ClientCommand.checkChildren(msg)) {
            this.addMessage(msg);
        }
    }

    public showPanel(show?: boolean) {
        if (show === undefined) {
            const willHide = this.commandPanel.classList.toggle('hidden');
            if (willHide) return;
            this.showAllMessages();
            return;
        }

        if (show) {
            this.commandPanel.classList.remove('hidden');
            this.showAllMessages();
            return;
        }

        this.commandPanel.classList.add('hidden');
    }

    private showAllMessages(): void {
        this.hiddenMessages.forEach(timer => clearTimeout(timer));
        for (const ele of this.commandPanel.children) {
            ele.classList.remove('hidden');
        }
    }

    public static checkChildren(
        element: HTMLElement,
        allowed: string[] = ["DIV", "P", "SPAN"],
        maxDepth: number = 2,
        currentDepth: number = 1) {
        if (currentDepth > maxDepth) {
            return false;
        }

        for (const child of Array.from(element.children)) {
            const tag = child.tagName;

            if (!allowed.includes(tag)) {
                return false;
            }

            if (!this.checkChildren(child as HTMLElement, allowed, maxDepth, currentDepth + 1)) {
                return false;
            }
        }

        return true;
    }

    public clearAllMessages(): void {
        this.commandPanel.textContent = '';
    }

    public override registry(): void {
        musicRegistry(this.dispatcher);
        devModCommand(this.dispatcher);
        clientSettingsCommand(this.dispatcher);
        commandBarCommand(this.dispatcher);
    }

    private executeCommand(command: string) {
        // @ts-ignore
        this.executeWithPrefix(this.source, command);
    }
}