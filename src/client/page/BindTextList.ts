import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {toText} from "./types.ts";

export class BindTextList {
    private readonly elements: HTMLElement[];
    private readonly texts: TranslatableText[];

    public constructor(elements: HTMLElement[], texts: TranslatableText[]) {
        if (elements.length !== texts.length) {
            throw new RangeError('The quantity must match.');
        }
        this.elements = elements;
        this.texts = texts;
    }

    public set(index: number, text: TranslatableText | string) {
        if (index < 0 || index > this.elements.length) return;

        this.texts[index] = toText(text);
    }

    public add(element: HTMLElement, text: TranslatableText | string) {
        this.elements.push(element);
        this.texts.push(toText(text));
    }

    public refresh() {
        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i].textContent = this.texts[i].toString();
        }
    }
}