import {TranslatableText} from "../../i18n/TranslatableText.ts";

export type GuiText = string | TranslatableText;

export function textOf(value: GuiText): string {
    return typeof value === 'string' ? value : value.toString();
}

export function toTrans(text: TranslatableText | string): TranslatableText {
    return typeof text === 'string' ? TranslatableText.of(text) : text;
}