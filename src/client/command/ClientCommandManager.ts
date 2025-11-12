import {CommandManager} from "../../command/CommandManager.ts";
import {MusicCommand} from "../../command/MusicCommand.ts";
import {DevModCommand} from "../../command/DevModCommand.ts";
import type {ClientCommandSource} from "./ClientCommandSource.ts";
import {ClientSettingsCommand} from "../../command/ClientSettingsCommand.ts";
import {CommandBarCommand} from "../../command/CommandBarCommand.ts";
import {CommandDispatcher} from "../../brigadier/CommandDispatcher.ts";
import type {CommandSource} from "../../command/CommandSource.ts";
import {KillCommand} from "../../command/KillCommand.ts";
import type {ServerCommandSource} from "../../server/command/ServerCommandSource.ts";
import {WorldDifficultCommand} from "../../command/WorldDifficultCommand.ts";
import type {ParseResults} from "../../brigadier/ParseResults.ts";
import {AnsiParser} from "../../utils/AnsiParser.ts";
import {StatusEffectCommand} from "../../command/StatusEffectCommand.ts";
import {ClientSuggestionPopup} from "./ClientSuggestionPopup.ts";
import {debounce} from "../../utils/uit.ts";

export type CommandNotifyCategory = 'info' | 'success' | 'warning' | 'error';

export class ClientCommandManager extends CommandManager {
    private readonly clientDispatcher: CommandDispatcher<ClientCommandSource> = new CommandDispatcher();
    private readonly source: ClientCommandSource;
    private readonly usedCommands: string[] = [];

    private readonly popup: ClientSuggestionPopup;
    private readonly commandPanel: HTMLDivElement;
    private readonly commandBar: HTMLLabelElement;
    private readonly commandInput: HTMLInputElement;

    private hiddenMessages = new Set<number>();
    private historyIndex = -1;
    private suggestionsLength = 0;
    private tokenStart = -1;
    private tokenEnd = -1;
    private completionIndex = -1;

    public constructor(source: ClientCommandSource) {
        super();
        this.source = source;

        this.popup = new ClientSuggestionPopup();

        this.commandBar = document.getElementById('command-bar') as HTMLLabelElement;
        this.commandInput = document.getElementById('command-input') as HTMLInputElement;
        this.commandPanel = document.getElementById('command-panel') as HTMLDivElement;

        this.commandBar.addEventListener('keydown', event => {
            if (event.code === 'Enter') {
                event.preventDefault();

                if (this.popup.popups) {
                    const activeItem = this.popup.getActiveItem();
                    if (!activeItem) return;
                    this.popup.applySuggestion(
                        activeItem.textContent!,
                        this.tokenStart,
                        this.tokenEnd
                    );
                    this.popup.cleanPopup();
                    return;
                }

                if (this.commandInput.value.length <= 0) return;
                const value = this.commandInput.value;

                this.usedCommands.push(value);
                if (this.usedCommands.length > 64) {
                    this.usedCommands.shift();
                }
                this.historyIndex = -1;
                this.commandInput.value = '';
                this.resetSuggestionLen();

                this.executeCommand(value);
                return;
            }

            if (event.code === 'ArrowUp') {
                event.preventDefault();
                if (this.popup.popups) {
                    this.completionIndex = (this.completionIndex - 1 + this.suggestionsLength) % this.suggestionsLength;
                    this.popup.highlightPopupItem(this.completionIndex);
                    return;
                }

                if (this.usedCommands.length <= 0) return;
                if (this.historyIndex === -1) {
                    this.historyIndex = this.usedCommands.length - 1;
                } else if (this.historyIndex > 0) {
                    this.historyIndex--;
                }
                this.commandInput.value = this.usedCommands[this.historyIndex];
                return;
            }

            if (event.code === 'ArrowDown') {
                event.preventDefault();
                if (this.popup.popups) {
                    this.completionIndex = (this.completionIndex + 1) % this.suggestionsLength;
                    this.popup.highlightPopupItem(this.completionIndex);
                    return;
                }

                if (this.usedCommands.length <= 0) return;
                if (this.historyIndex >= 0 && this.historyIndex < this.usedCommands.length - 1) {
                    this.historyIndex++;
                    this.commandInput.value = this.usedCommands[this.historyIndex];
                } else {
                    this.historyIndex = -1;
                    this.commandInput.value = '';
                }
                return;
            }

            if (event.code === 'Tab') {
                event.preventDefault();
                const activeItem = this.popup.getActiveItem();
                if (!activeItem) return;
                this.popup.applySuggestion(
                    activeItem.textContent!,
                    this.tokenStart,
                    this.tokenEnd
                );
                this.popup.cleanPopup();
                return;
            }

            if (event.code === 'Escape') {
                this.popup.cleanPopup();
                this.resetSuggestionLen();
                return;
            }

            if (event.ctrlKey && event.code === 'Space') {
                event.preventDefault();
                this.giveSuggestions().catch();
            }

            if (event.ctrlKey && event.code === 'KeyW') {
                event.preventDefault();
                const cursor = this.commandInput.selectionStart ?? 0;
                const text = this.commandInput.value;

                let start = cursor;
                while (start > 0 && text[start - 1] !== ' ') {
                    start--;
                }
                let end = cursor;
                while (end < text.length && text[end] !== ' ') {
                    end++;
                }
                this.commandInput.setSelectionRange(start, end);
            }
        });

        const suggestionTimer = debounce(this.giveSuggestions.bind(this), 200);
        this.commandInput.addEventListener('input', suggestionTimer);

        this.registry();
    }

    private async giveSuggestions() {
        const value = this.commandInput.value;
        const cursor = this.commandInput.selectionStart ?? value.length;

        const clientResults = this.clientDispatcher.parse(value, this.source);
        const clientSuggestions = await this.clientDispatcher.getCompletionSuggestionsWithCursor(clientResults, cursor);

        // @ts-expect-error 尝试服务端命令解析
        const serverResults = this.dispatcher.parse(value, this.source);
        const serverSuggestions = await this.dispatcher.getCompletionSuggestionsWithCursor(serverResults, cursor);

        const suggestions = [
            ...serverSuggestions.getList(),
            ...clientSuggestions.getList()
        ];

        if (suggestions.length > 0) {
            const texts = suggestions.map(s => s.getText());
            const range = suggestions[0].getRange();

            this.popup.renderPopup(texts, range.getStart(), range.getEnd());

            this.suggestionsLength = texts.length;
            this.tokenStart = range.getStart();
            this.tokenEnd = range.getEnd();
            this.completionIndex = 0;

            this.popup.highlightPopupItem(this.completionIndex);
        } else {
            this.resetSuggestionLen();
            this.popup.cleanPopup();
        }
    }

    private resetSuggestionLen() {
        this.suggestionsLength = 0;
        this.tokenStart = -1;
        this.tokenEnd = -1;
        this.completionIndex = -1;
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

    public showPanel(show?: boolean): boolean {
        if (show === undefined) {
            this.commandBar.classList.toggle('hidden');
            const willHide = this.commandPanel.classList.toggle('hidden');
            if (willHide) {
                this.resetSuggestionLen();
                this.popup.cleanPopup();
                return false;
            }

            this.commandInput.focus();
            this.showAllMessages();
            return true;
        }

        if (show) {
            this.commandBar.classList.remove('hidden');
            this.commandPanel.classList.remove('hidden');
            this.commandInput.focus();
            this.showAllMessages();
            return true;
        }

        this.commandBar.classList.add('hidden');
        this.commandPanel.classList.add('hidden');
        this.resetSuggestionLen();
        this.popup.cleanPopup();
        return false;
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

    public executeCommand(command: string) {
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
            const node = lastNode.node;
            const cmd = node.getCommand();
            if (!cmd) {
                this.addPlainMessage(`\x1b[31mCommand "${node.getName()}" is not executable, with command: "${command}"`);
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