export class ClientSuggestionPopup {
    private readonly measureCtx: CanvasRenderingContext2D;

    private readonly commandBar: HTMLLabelElement;
    private readonly commandInput: HTMLInputElement;
    private popupItems: HTMLSpanElement | null = null;

    public constructor() {
        this.measureCtx = document.createElement('canvas').getContext('2d', {
            alpha: false,
        })!;
        this.commandBar = document.getElementById('command-bar') as HTMLLabelElement;
        this.commandInput = document.getElementById('command-input') as HTMLInputElement;
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

        const input = this.commandInput;
        if (input.value.lastIndexOf(' ') === -1) {
            this.popupItems.style.left = '0px';
            return;
        }

        const style = window.getComputedStyle(input);

        this.measureCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

        const cursorPos = input.selectionStart;
        if (!cursorPos) return;
        const subText = input.value.slice(0, cursorPos);
        const width = this.measureCtx.measureText(subText).width;
        this.popupItems.style.left = `${width}px`;
    }

    public highlightPopupItem(index: number) {
        const children = this.popupItems?.children;
        if (!children) return;
        for (let i = 0; i < children.length; i++) {
            children[i].classList.toggle('active', i === index);
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

    public get popups() {
        return this.popupItems;
    }

    public cleanPopup() {
        this.popupItems?.remove();
        this.popupItems = null;
    }
}