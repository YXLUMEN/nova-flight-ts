import {type GuiText, textOf} from "../types.ts";
import type {Consumer} from "../../../type/types.ts";
import {empty} from "../../../utils/uit.ts";
import {assert} from "../../../utils/dom_util.ts";
import {PageSection} from "../PageSection.ts";

export class FullscreenNotice extends PageSection implements EventListenerObject {
    private readonly label: HTMLElement;
    private readonly button: HTMLElement;

    private onConfirm: Consumer<void> = empty;
    private cancelled = false;
    private resolvers: PromiseWithResolvers<void> = Promise.withResolvers<void>();

    public constructor() {
        super('fullscreen-notice');

        this.label = assert(this.root, '.title');
        this.button = assert(this.root, '.c-button');
    }

    protected override onOpened() {
        this.cancelled = false;
        this.button.removeEventListener('click', this);
        this.button.addEventListener('click', this);
    }

    protected override onClosed() {
        this.cancelled = true;

        this.button.removeEventListener('click', this);
        this.label.textContent = '';
        this.button.textContent = '';

        this.onConfirm = empty;
        this.resolvers.resolve();
        this.resolvers = Promise.withResolvers<void>();
    }

    protected override onDestroy() {
        this.resolvers.resolve();
    }

    public handleEvent(event: Event) {
        if (event.type !== 'click') return;
        this.onConfirm();
        this.close();
    }

    public setBackground(color: string) {
        this.root.style.background = color;
    }

    public setMessage(text: GuiText, fontFamily?: string, fontSize?: string): void {
        this.label.textContent = textOf(text);
        if (fontFamily) this.label.style.fontFamily = fontFamily;
        if (fontSize) this.label.style.fontSize = fontSize;
    }

    public setLabel(label: GuiText | null): void {
        this.button.classList.toggle('hidden', label === null);
        if (label !== null) this.button.textContent = textOf(label);
    }

    public setOnConfirm(callback: Consumer<void>): void {
        this.onConfirm = callback;
    }

    public isCancelled(): boolean {
        return this.cancelled;
    }

    public waitClose(): Promise<void> {
        return this.resolvers.promise;
    }
}