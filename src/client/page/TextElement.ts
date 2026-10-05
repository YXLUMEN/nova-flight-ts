import {TranslatableText} from "../../i18n/TranslatableText.ts";

export class TextElement<T extends HTMLElement> {
    public readonly element: T;
    private text: TranslatableText;

    public constructor(element: T, text: TranslatableText | string) {
        this.element = element;
        this.text = typeof text === 'string' ? TranslatableText.of(text) : text;
    }

    public static from(element: HTMLElement) {
        const key = element.getAttribute('data-i18n');
        return new TextElement(element, key ?? 'missing');
    }

    public refresh() {
        this.element.textContent = this.text.toString();
    }

    public setText(text: TranslatableText) {
        this.text = text;
        this.refresh();
    }
}