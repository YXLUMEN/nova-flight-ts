import type {TranslatableText} from "../../i18n/TranslatableText.ts";

export type GuiText = string | TranslatableText;

export function textOf(value: GuiText): string {
    return typeof value === "string" ? value : value.toString();
}