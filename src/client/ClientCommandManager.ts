import {CommandManager} from "../command/CommandManager.ts";
import {MusicCommand} from "../command/MusicCommand.ts";
import {DevModCommand} from "../command/DevModCommand.ts";
import type {ClientCommandSource} from "./command/ClientCommandSource.ts";
import {ClientSettingsCommand} from "../command/ClientSettingsCommand.ts";
import {CommandBarCommand} from "../command/CommandBarCommand.ts";
import {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {CommandSource} from "../command/CommandSource.ts";
import {KillCommand} from "../command/KillCommand.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import {WorldDifficultCommand} from "../command/WorldDifficultCommand.ts";
import type {ParseResults} from "../brigadier/ParseResults.ts";
import {AnsiParser} from "../utils/AnsiParser.ts";
import {StatusEffectCommand} from "../command/StatusEffectCommand.ts";

export type CommandNotifyCategory = 'info' | 'success' | 'warning' | 'error';

export class ClientCommandManager extends CommandManager {
    private readonly clientDispatcher: CommandDispatcher<ClientCommandSource> = new CommandDispatcher();
    private readonly source: ClientCommandSource;
    private readonly usedCommands: string[] = [];
    private readonly commandPanel: HTMLDivElement;

    private hiddenMessages = new Set<number>();
    private historyIndex = -1;

    public constructor(source: ClientCommandSource) {
        super();
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

            if (event.code === 'Tab') {
                event.preventDefault();
                return;
            }
        });

        this.registry();
    }

    public addPlainMessage(msg: string) {
        const div = AnsiParser.parseToElement(msg);
        div.classList.add('notify');
        this.addMessage(div);
    }

    private addMessage(msg: HTMLDivElement) {
        this.commandPanel.append(msg);

        if (this.commandPanel.childElementCount > 64) {
            this.commandPanel.firstChild?.remove();
        }
        this.commandPanel.scrollTop = this.commandPanel.scrollHeight;

        if (!this.commandPanel.classList.contains('hidden')) return;

        const timer = setTimeout(() => {
            msg.classList.add('hidden');
            this.hiddenMessages.delete(timer);
        }, 3000);
        this.hiddenMessages.add(timer);
    }

    public addMessageElement(msg: HTMLDivElement) {
        if (!msg.classList.contains('notify')) return;

        if (ClientCommandManager.checkChildren(msg)) {
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
        MusicCommand.registry(this.clientDispatcher);
        DevModCommand.registry(this.clientDispatcher);
        ClientSettingsCommand.registry(this.clientDispatcher);
        CommandBarCommand.registry(this.clientDispatcher);

        KillCommand.registry(this.dispatcher);
        WorldDifficultCommand.registry(this.dispatcher);
        StatusEffectCommand.registry(this.dispatcher);
    }

    public executeWithPrefix(source: CommandSource, input: string): void {
        const command = input.startsWith("/") ? input.slice(1) : input;
        if (command.length === 0) return;

        // 尝试解析服务端命令
        const serverResults = this.dispatcher.parse(command, source as ServerCommandSource);
        const contextBuilder = serverResults.context;
        const context = contextBuilder.build(command);
        const lastNode = context.nodes.at(-1);
        if (lastNode) {
            this.source.getClient().networkHandler.sendCommand(command);
            return;
        }

        const clientResults = this.clientDispatcher.parse(command, source as ClientCommandSource);
        this.executeClient(clientResults, command);
    }

    private executeCommand(command: string) {
        this.executeWithPrefix(this.source, command);
    }

    private executeClient(parseResults: ParseResults<ClientCommandSource>, command: string): void {
        try {
            const contextBuilder = parseResults.context;

            const context = contextBuilder.build(command);
            const lastNode = context.nodes.at(-1);
            if (!lastNode) {
                this.addPlainMessage(`\x1b[31mNo such command: "${command}"`);
                return;
            }

            const cmd = lastNode.getCommand();
            if (!cmd) {
                this.addPlainMessage(`\x1b[31mCommand "${lastNode.getName()}" is not executable, with command: "${command}"`);
                return
            }
            cmd(context);
        } catch (err) {
            console.error(`[Client] Failed to execute command for command "${command}": ${err}`);

            for (const exception of parseResults.exceptions.values()) {
                this.addPlainMessage(exception.message);
                console.warn(exception);
            }

            if (err instanceof Error) {
                this.addPlainMessage(err.message);
            }
        }
    }
}