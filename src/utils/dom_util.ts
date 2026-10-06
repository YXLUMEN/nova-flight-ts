import type {Constructor} from "../type/types.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {TextElement} from "../client/page/TextElement.ts";
import {BindTextList} from "../client/page/BindTextList.ts";

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

export function bindFrom(target: HTMLElement): BindTextList {
    const nodes = target.querySelectorAll('[data-i18n]');
    const elements: HTMLElement[] = [];
    const texts: TranslatableText[] = [];

    for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;

        const key = node.getAttribute('data-i18n');
        if (key == null) continue;

        elements.push(node);
        texts.push(TranslatableText.of(key));
    }

    return new BindTextList(elements, texts);
}