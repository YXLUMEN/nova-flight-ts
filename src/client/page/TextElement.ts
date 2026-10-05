import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {textOf} from "./types.ts";

export class TextElement<T extends HTMLElement> {
    public readonly element: T;
    private text: TranslatableText;

    public constructor(element: T, text: TranslatableText | string) {
        this.element = element;
        this.text = typeof text === 'string' ? TranslatableText.of(text) : text;
    }

    public refresh() {
        this.element.textContent = textOf(this.text);
    }

    public setText(text: TranslatableText) {
        this.text = text;
        this.refresh();
    }
}