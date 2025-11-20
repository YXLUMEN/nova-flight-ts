import {AnsiParser} from "../../utils/AnsiParser.ts";

export class ClientCommandPanel {
    private readonly hiddenTimer = new Set<number>();

    private readonly commandPanel: HTMLDivElement;
    private readonly commandBar: HTMLLabelElement;
    private readonly commandInput: HTMLInputElement;

    private isShow: boolean = false;

    public constructor(commandPanel: HTMLDivElement, commandBar: HTMLLabelElement, commandInput: HTMLInputElement) {
        this.commandPanel = commandPanel;
        this.commandBar = commandBar;
        this.commandInput = commandInput;
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

        if (this.isShow) return;

        const timer = setTimeout(() => {
            msg.classList.add('hidden');
            this.hiddenTimer.delete(timer);
        }, 5000);
        this.hiddenTimer.add(timer);
    }

    public addMessageElement(msg: HTMLDivElement) {
        if (!msg.classList.contains('notify')) return;

        if (ClientCommandPanel.checkChildren(msg)) {
            this.addMessage(msg);
        }
    }

    public isShowing() {
        return this.isShow;
    }

    public switchPanel(show?: boolean): boolean {
        if (show === undefined) {
            this.isShow ? this.hiddenPanel() : this.showPanel();
            return this.isShow;
        }
        show ? this.showPanel() : this.hiddenPanel();
        return show;
    }

    public showPanel() {
        if (this.isShow) return;
        this.isShow = true;

        this.commandBar.classList.remove('hidden');
        this.commandPanel.classList.remove('hidden');
        this.commandInput.focus();
        this.showAllMessages();
    }

    public hiddenPanel() {
        if (!this.isShow) return;
        this.isShow = false;

        this.commandBar.classList.add('hidden');
        this.commandPanel.classList.add('hidden');
        this.hideAllMessage();
    }

    private showAllMessages(): void {
        this.hiddenTimer.forEach(timer => clearTimeout(timer));
        for (const ele of this.commandPanel.children) {
            ele.classList.remove('hidden');
        }
    }

    private hideAllMessage(): void {
        for (const ele of this.commandPanel.children) {
            ele.classList.add('hidden');
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
}