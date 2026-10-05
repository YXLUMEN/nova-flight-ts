import type {Constructor} from "../type/types.ts";
import type {TranslatableText} from "../i18n/TranslatableText.ts";
import {TextElement} from "../client/page/TextElement.ts";

export function closest(element: unknown, selector: string) {
    if (element instanceof HTMLElement) {
        return element.closest(selector);
    }
    return null;
}

export function dataAction(element: unknown) {
    if (element instanceof Element) {
        return element.getAttribute('data-action');
    }
    return null;
}

export function assert(target: HTMLElement, selectors: string): HTMLElement {
    const result = target.querySelector(selectors);
    if (result instanceof HTMLElement) {
        return result;
    }
    throw new Error(`Cannot find element with query: ${selectors}`);
}

export function as<T extends HTMLElement>(
    target: HTMLElement,
    selectors: string,
    type: Constructor<T>
): T {
    const result = target.querySelector(selectors);
    if (result instanceof type) {
        return result;
    }
    throw new Error(`Cannot find element with query: ${selectors}`);
}

export function bindText<T extends HTMLElement>(
    target: HTMLElement,
    selectors: string,
    text: TranslatableText | string
): TextElement<T> {
    const element = assert(target, selectors) as T;
    return new TextElement(element, text);
}

export function bindTexts(target: HTMLElement, map: Record<string, TranslatableText | string>): TextElement<HTMLElement>[] {
    const texts: TextElement<HTMLElement>[] = [];
    for (const [selector, text] of Object.entries(map)) {
        texts.push(bindText(target, selector, text));
    }
    return texts;
}