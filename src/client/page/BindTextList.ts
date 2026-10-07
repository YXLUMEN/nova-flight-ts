import type {TranslatableText} from "../../i18n/TranslatableText.ts";
import {TextElement} from "./TextElement.ts";

export class BindTextList {
    private readonly binds: TextElement[];

    public constructor(binds: TextElement[]) {
        this.binds = binds;
    }

    public add(element: HTMLElement, text: TranslatableText | string) {
        this.binds.push(new TextElement(element, text));
    }

    public addBind(bind: TextElement) {
        this.binds.push(bind);
    }

    public refresh() {
        for (let i = 0; i < this.binds.length; i++) {
            this.binds[i].refresh();
        }
    }
}