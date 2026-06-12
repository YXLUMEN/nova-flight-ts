export class ClientSuggestionPopup {
    private readonly measureCtx: OffscreenCanvasRenderingContext2D;

    private readonly commandBar: HTMLLabelElement;
    private readonly commandInput: HTMLInputElement;

    private tokenStart: number = -1;
    private tokenEnd: number = -1;
    private lastAppliedLen: number = 0;
    private popupItems: HTMLSpanElement | null = null;

    public constructor(commandBar: HTMLLabelElement, commandInput: HTMLInputElement) {
        const canvas = new OffscreenCanvas(1, 1);
        this.measureCtx = canvas.getContext('2d', {
            alpha: false
        })!;
        this.measureCtx.imageSmoothingEnabled = false;

        this.commandBar = commandBar
        this.commandInput = commandInput

        this.changeFont();
    }

    private createPopup(): HTMLSpanElement {
        const popup = document.createElement('span');
        popup.className = 'suggestion-popup';
        popup.onclick = event => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const item = target.closest('.suggestion-item');
            if (!item) return;

            this.lastAppliedLen = 0;
            this.applySuggestion(item.textContent);
            this.popupItems = null;
            popup.remove();
        };

        this.cleanPopup();
        return popup;
    }

    public renderPopup(suggestions: string[], tokenStart: number, tokenEnd: number): void {
        this.tokenStart = tokenStart;
        this.tokenEnd = tokenEnd;
        this.lastAppliedLen = 0;

        if (!this.popupItems) {
            this.popupItems = this.createPopup();
            this.commandBar.appendChild(this.popupItems);
        }

        const frag = document.createDocumentFragment();
        suggestions.forEach(s => {
            const span = document.createElement('span');
            span.className = 'suggestion-item';
            span.textContent = s;
            frag.appendChild(span);
        });
        this.popupItems.replaceChildren(frag);

        this.repositionPopup(tokenStart);
    }

    public repositionPopup(tokenStart: number): void {
        if (!this.popupItems) return;

        const input = this.commandInput.value;
        const text = input.substring(0, tokenStart + 1);
        const width = this.measureCtx.measureText(text).width;
        this.popupItems.style.left = `${width}px`;
    }

    public highlightPopupItem(index: number): void {
        const children = this.popupItems?.children;
        if (!children) return;

        for (let i = 0; i < children.length; i++) {
            const isActive = i === index;
            children[i].classList.toggle('active', isActive);
            if (!isActive) continue;

            children[i].scrollIntoView({
                block: "nearest"
            });
        }
    }

    public applySuggestion(suggestion: string): void {
        const value = this.commandInput.value;

        const replaceEnd = this.lastAppliedLen > 0
            ? this.tokenStart + this.lastAppliedLen
            : this.tokenEnd;
        const beforeToken = value.slice(0, this.tokenStart);
        const afterToken = value.slice(replaceEnd);

        this.commandInput.value = `${beforeToken}${suggestion}${afterToken}`;
        this.lastAppliedLen = suggestion.length;

        const newCursor = this.tokenStart + suggestion.length;
        this.commandInput.setSelectionRange(newCursor, newCursor);

        this.repositionPopup(this.tokenStart);
    }

    public getActiveItem() {
        return this.popupItems?.querySelector('.active') ?? null;
    }

    public getPopups() {
        return this.popupItems;
    }

    public cleanPopup(): void {
        this.popupItems?.remove();
        this.popupItems = null;
        this.lastAppliedLen = 0;
    }

    private changeFont(): void {
        const style = window.getComputedStyle(this.commandInput);
        const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;

        if (this.measureCtx.font === font) return;
        this.measureCtx.font = font;
    }
}