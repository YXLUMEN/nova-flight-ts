import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {textOf, toTrans} from "./types.ts";

export class TextElement {
    private readonly element: HTMLElement;
    private readonly attrs: string[] | null;
    private text: TranslatableText;

    public constructor(element: HTMLElement, text: TranslatableText | string, attrs: string[] | null = null) {
        this.element = element;
        this.attrs = attrs;
        this.text = toTrans(text);
    }

    public refresh() {
        const text = textOf(this.text);
        if (this.attrs === null) {
            this.element.textContent = text;
            return;
        }

        for (const attr of this.attrs) {
            this.element.setAttribute(attr, text);
        }
    }

    public setText(text: TranslatableText | string) {
        this.text = toTrans(text);
        this.refresh();
    }
}