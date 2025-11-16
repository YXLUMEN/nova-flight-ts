export class ClientSuggestionPopup {
    private readonly measureCtx: OffscreenCanvasRenderingContext2D;
    private font: string = '';

    private readonly commandBar: HTMLLabelElement;
    private readonly commandInput: HTMLInputElement;
    private popupItems: HTMLSpanElement | null = null;

    public constructor(commandBar: HTMLLabelElement, commandInput: HTMLInputElement) {
        const canvas = new OffscreenCanvas(1, 1);
        this.measureCtx = canvas.getContext('2d')!;

        this.commandBar = commandBar
        this.commandInput = commandInput

        this.changeFont();
    }

    public renderPopup(suggestions: string[], tokenStart: number, tokenEnd: number) {
        const popup = document.createElement('span');
        popup.className = 'suggestion-popup';

        suggestions.forEach(s => {
            const span = document.createElement('span');
            span.textContent = s;
            span.onclick = () => {
                this.applySuggestion(s, tokenStart, tokenEnd);
                this.popupItems = null;
                popup.remove();
            };
            popup.appendChild(span);
        });

        this.popupItems?.remove();
        this.popupItems = popup;
        this.commandBar.appendChild(popup);
        this.repositionPopup();
    }

    public repositionPopup() {
        if (!this.popupItems) return;

        const input = this.commandInput.value;
        if (input.lastIndexOf(' ') === -1) {
            this.popupItems.style.left = '0px';
            return;
        }

        this.changeFont();

        const width = this.measureCtx.measureText(input).width;
        this.popupItems.style.left = `${width}px`;
    }

    public highlightPopupItem(index: number) {
        const children = this.popupItems?.children;
        if (!children) return;

        for (let i = 0; i < children.length; i++) {
            const isActive = i === index;
            children[i].classList.toggle('active', isActive);
            if (isActive) children[i].scrollIntoView({
                block: "nearest"
            });
        }
    }

    public applySuggestion(suggestion: string, tokenStart: number, tokenEnd: number) {
        const value = this.commandInput.value;

        const beforeToken = value.slice(0, tokenStart);
        const afterToken = value.slice(tokenEnd);
        this.commandInput.value = `${beforeToken}${suggestion}${afterToken}`;

        let newCursor = tokenStart + suggestion.length;
        if (afterToken.startsWith(' ')) {
            newCursor += 1;
        }
        this.commandInput.setSelectionRange(newCursor, newCursor);

        this.repositionPopup();
    }

    public getActiveItem() {
        return this.popupItems?.querySelector('.active') ?? null;
    }

    public getPopups() {
        return this.popupItems;
    }

    public cleanPopup() {
        this.popupItems?.remove();
        this.popupItems = null;
    }

    private changeFont() {
        const style = window.getComputedStyle(this.commandInput);
        const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;

        if (this.font === font) return;

        this.font = font;
        this.measureCtx.font = font;
    }
}