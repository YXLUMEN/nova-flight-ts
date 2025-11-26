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
import {StatusEffectCommand} from "../../command/StatusEffectCommand.ts";
import {ClientSuggestionPopup} from "./ClientSuggestionPopup.ts";
import {debounce} from "../../utils/uit.ts";
import {ClientCommandPanel} from "./ClientCommandPanel.ts";
import type {Suggestion} from "../../brigadier/suggestion/Suggestion.ts";
import {MemoryLRU} from "../../utils/collection/MemoryLRU.ts";
import {StringReader} from "../../brigadier/StringReader.ts";

export type CommandNotifyCategory = 'info' | 'success' | 'warning' | 'error';

export class ClientCommandManager extends CommandManager {
    private readonly clientDispatcher: CommandDispatcher<ClientCommandSource> = new CommandDispatcher();
    private readonly source: ClientCommandSource;

    private historyIndex = -1;
    private readonly usedCommands: string[] = [];

    private readonly popup: ClientSuggestionPopup;
    private readonly commandPanel: ClientCommandPanel;

    private readonly commandInput: HTMLInputElement;

    // client + server
    private parse: ParseResults<any>[] | null = null;
    private suggestionCache: MemoryLRU<string, Suggestion[]> = new MemoryLRU(12);
    private suggestionsLength = 0;
    private tokenStart = -1;
    private completionIndex = -1;

    public constructor(source: ClientCommandSource) {
        super();
        this.source = source;

        this.commandInput = document.getElementById('command-input') as HTMLInputElement;
        const commandBar = document.getElementById('command-bar') as HTMLLabelElement;
        const commandPanel = document.getElementById('command-panel') as HTMLDivElement;

        this.popup = new ClientSuggestionPopup(commandBar, this.commandInput);
        this.commandPanel = new ClientCommandPanel(commandPanel, commandBar, this.commandInput);

        commandBar.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const input = this.commandInput.value;

                if (this.popup.getPopups()) {
                    const activeItem = this.popup.getActiveItem();
                    if (!activeItem) return;
                    this.popup.applySuggestion(
                        activeItem.textContent!,
                        this.tokenStart,
                        input.length
                    );
                    this.popup.cleanPopup();
                    return;
                }

                if (input.length <= 0) return;
                if (!input.startsWith('/')) {
                    this.source.getClient().clientChat.sendMessage(input);
                    this.commandInput.value = '';
                    return;
                }

                this.usedCommands.push(input);
                if (this.usedCommands.length > 64) {
                    this.usedCommands.shift();
                }
                this.historyIndex = -1;
                this.commandInput.value = '';
                this.resetSuggestionLen();

                this.executeCommand(input);
                return;
            }

            if (event.code === 'ArrowUp') {
                event.preventDefault();
                if (this.popup.getPopups()) {
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
                if (this.popup.getPopups()) {
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
                if (!this.popup.getPopups()) return;

                // 轮询并应用
                this.popup.highlightPopupItem(this.completionIndex);
                const activeItem = this.popup.getActiveItem();
                this.completionIndex = (this.completionIndex + 1) % this.suggestionsLength;

                if (!activeItem) return;

                this.popup.applySuggestion(
                    activeItem.textContent!,
                    this.tokenStart,
                    this.commandInput.value.length,
                );
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
                return;
            }
        });

        const suggestionTimer = debounce(this.giveSuggestions.bind(this), 200);
        this.commandInput.addEventListener('input', suggestionTimer);

        this.registry();
    }

    public handlerEsp() {
        if (this.popup.getPopups()) {
            this.popup.cleanPopup();
            this.resetSuggestionLen();
            return false;
        }
        this.switchPanel(false);
        return true;
    }

    private async giveSuggestions() {
        const command = this.commandInput.value;
        if (!command.startsWith('/')) {
            this.popup.cleanPopup();
            return;
        }

        const cache = this.suggestionCache.get(command);
        if (cache) {
            this.renderSuggestions(cache);
            return;
        }
        this.parse = null;

        const cursor = this.commandInput.selectionStart ?? command.length;

        const reader = new StringReader(command);
        reader.skip();
        if (reader.peek() === '/') return;
        const cloneReader = StringReader.fromReader(reader);

        const clientResults = this.clientDispatcher.parseReader(reader, this.source);
        // @ts-expect-error 尝试服务端命令解析
        const serverResults = this.dispatcher.parseReader(cloneReader, this.source);

        const clientSuggestions = await this.clientDispatcher.getCompletionSuggestionsWithCursor(clientResults, cursor);
        const serverSuggestions = await this.dispatcher.getCompletionSuggestionsWithCursor(serverResults, cursor);

        const suggestions = [...clientSuggestions.getList(), ...serverSuggestions.getList()];
        this.suggestionCache.set(command, suggestions);
        this.parse = [clientResults, serverResults];

        this.renderSuggestions(suggestions);
    }

    private showUsages() {
        if (!this.parse) return;

        const cursor = this.commandInput.selectionStart ?? this.commandInput.value.length;
        const usage = [];

        const clientCommandBuilder = this.parse[0].context;
        const clientSuggestionContext = clientCommandBuilder.findSuggestionContext(cursor);
        if (clientSuggestionContext.parent.getType() !== 0) {
            usage.push(...this.clientDispatcher.getAllUsage(clientSuggestionContext.parent, this.source));
        }

        const commandBuilder = this.parse[1].context;
        const suggestionContext = commandBuilder.findSuggestionContext(cursor);
        if (suggestionContext.parent.getType() !== 0) {
            // @ts-expect-error
            usage.push(...this.dispatcher.getAllUsage(suggestionContext.parent, this.source));
        }

        if (usage.length > 0) {
            this.popup.renderPopup(usage, cursor, cursor);
        }
    }

    private renderSuggestions(suggestions: Suggestion[]) {
        if (suggestions.length > 0) {
            const texts = suggestions.map(s => s.getText());
            const range = suggestions[0].getRange();

            this.popup.renderPopup(texts, range.getStart(), range.getEnd());

            this.suggestionsLength = texts.length;
            this.tokenStart = range.getStart();
            this.completionIndex = 0;

            this.popup.highlightPopupItem(this.completionIndex);
        } else {
            this.resetSuggestionLen();
            this.popup.cleanPopup();
        }

        if (!this.popup.getPopups()) {
            this.showUsages();
        }
    }

    private resetSuggestionLen() {
        this.suggestionsLength = 0;
        this.tokenStart = -1;
        this.completionIndex = -1;
    }

    public getInput(): string {
        return this.commandInput.value;
    }

    public addPlainMessage(msg: string): void {
        this.commandPanel.addPlainMessage(msg);
    }

    public isShow() {
        return this.commandPanel.isShowing();
    }

    public switchPanel(show?: boolean): boolean {
        const isShow = this.commandPanel.switchPanel(show);
        if (!isShow) {
            this.resetSuggestionLen();
            this.popup.cleanPopup();
        }

        return isShow;
    }

    public clearAllMessages(): void {
        this.commandPanel.clearAllMessages();
    }

    public override registry(): void {
        MusicCommand.registry(this.clientDispatcher);
        ClientSettingsCommand.registry(this.clientDispatcher);
        CommandBarCommand.registry(this.clientDispatcher);

        KillCommand.registry(this.dispatcher);
        DevModCommand.registry(this.dispatcher);
        WorldDifficultCommand.registry(this.dispatcher);
        StatusEffectCommand.registry(this.dispatcher);
    }

    public executeWithPrefix(source: CommandSource, input: string): void {
        const command = input.startsWith('/') ? input.slice(1) : input;
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
                this.commandPanel.addPlainMessage(`\x1b[31mNo such command: "${command}"`);
                return;
            }

            const node = lastNode.node;
            const cmd = node.getCommand();
            if (cmd) {
                cmd(context);
                return;
            }

            const requiredArgs = node.getChildren()
                .filter(child => child.getType() === 2)
                .map(arg => arg.getName())
                .toArray();

            if (requiredArgs.length > 0) {
                this.commandPanel.addPlainMessage(
                    `\x1b[31mMust provide at least one argument: "${requiredArgs.join('|')}"`);
                return;
            }

            this.commandPanel.addPlainMessage(`\x1b[31mCommand "${node.getName()}" is not executable, with command: "${command}"`);
        } catch (err) {
            console.error(`[Client] Failed to execute command for command "${command}": ${err}`);

            for (const exception of parseResults.exceptions.values()) {
                this.commandPanel.addPlainMessage(exception.message);
                console.warn(exception);
            }

            if (err instanceof Error) {
                this.commandPanel.addPlainMessage(err.message);
            }
        }
    }
}