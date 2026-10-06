import type {Constructor} from "../type/types.ts";
import type {TranslatableText} from "../i18n/TranslatableText.ts";
import {TextElement} from "../client/page/TextElement.ts";

export function closest(element: unknown, selector: string): Element | null {
    if (element instanceof HTMLElement) {
        return element.closest(selector);
    }
    return null;
}

export function closestHTML(element: unknown, selector: string): HTMLElement | null {
    if (element instanceof HTMLElement) {
        const target = element.closest(selector);
        if (target instanceof HTMLElement) return target
    }
    return null;
}

export function dataAction(element: Element | null) {
    return element === null ? null : element.getAttribute('data-action');
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

export function bindFrom(target: HTMLElement): TextElement<HTMLElement>[] {
    const elements = target.querySelectorAll('[data-i18n]');
    const texts: TextElement<HTMLElement>[] = [];

    for (const element of elements) {
        if (!(element instanceof HTMLElement)) continue;

        const key = element.getAttribute('data-i18n');
        if (key == null) continue;

        texts.push(new TextElement(element, key));
    }

    return texts;
}