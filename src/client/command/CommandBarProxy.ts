import type {ClientSuggestionPopup} from "./ClientSuggestionPopup.ts";
import type {ClientCommandPanel} from "./ClientCommandPanel.ts";
import type {ClientCommandManager} from "./ClientCommandManager.ts";
import type {Consumer} from "../../type/types.ts";
import {empty} from "../../utils/uit.ts";
import {PageSection} from "../page/PageSection.ts";

export class CommandBarProxy extends PageSection {
    private readonly command: ClientCommandManager
    private readonly popup: ClientSuggestionPopup;
    private readonly commandPanel: ClientCommandPanel;
    private release: Consumer<void> = empty;

    public constructor(
        command: ClientCommandManager,
        popup: ClientSuggestionPopup,
        commandPanel: ClientCommandPanel
    ) {
        super('command-bar-proxy');

        this.command = command;
        this.popup = popup;
        this.commandPanel = commandPanel;
    }

    protected override onOpened() {
        this.release = this.manager!.input.requireInput();
        this.switchPanel(true);
    }

    protected override onClosed() {
        this.switchPanel(false);
        this.release();
    }

    public override keyDown(event: KeyboardEvent): boolean {
        if (event.code === 'Escape') {
            if (this.popup.getPopups()) {
                this.popup.cleanPopup();
                this.command.resetSuggestionLen();
                return true;
            }

            this.close();
            event.stopImmediatePropagation();
            return true;
        }

        return false;
    }

    private switchPanel(show: boolean): void {
        if (show) {
            this.commandPanel.showPanel();
            return;
        }

        this.popup.cleanPopup();
        this.commandPanel.hiddenPanel();
        this.command.resetSuggestionLen();
    }
}