import type {Constructor} from "../../type/types.ts";
import type {TranslatableText} from "../../i18n/TranslatableText.ts";
import {TextElement} from "./TextElement.ts";
import type {GuiManager} from "./GuiManager.ts";

export abstract class PageSection {
    // 由管理器设置
    public manager: GuiManager | null = null;

    protected readonly root: HTMLElement;

    protected constructor(page: HTMLElement | string) {
        const root = typeof page === 'string' ?
            document.getElementById(page)! :
            page;

        if (root === null || !root.classList.contains('c-section')) {
            throw new DOMException('The page root doesn\'t contain ".c-section"');
        }
        this.root = root;
    }

    public isShow(): boolean {
        return !this.root.classList.contains('hidden');
    }

    public close(): void {
        this.manager?.pop(this);
    }

    public destroy(): void {
        this.close();
    }

    protected onOpened(): void {
    }

    protected onClosed(): void {
    }

    /**
     * @readonly
     * @inner
     * 由管理器在 push / pop 时调用
     * */
    public notifyOpened(): void {
        if (this.isShow()) return;
        this.root.classList.remove('hidden');
        this.onOpened();
    }

    /**
     * @readonly
     * @inner
     * 由管理器在 pop 时调用(保证只回调一次)
     * */
    public notifyClosed(): void {
        if (!this.isShow()) return;
        this.root.classList.add('hidden');
        this.onClosed();
    }

    /**
     * @readonly
     * @inner
     * 层级.由管理器调用
     * */
    public index(i: number) {
        this.root.style.zIndex = String(i);
    }

    protected assert(target: HTMLElement, selectors: string): HTMLElement {
        const result = target.querySelector(selectors);
        if (result instanceof HTMLElement) {
            return result;
        }
        throw new Error(`Cannot find element with query: ${selectors}`);
    }

    protected as<T extends HTMLElement>(
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

    protected bindText<T extends HTMLElement>(
        target: HTMLElement,
        selectors: string,
        text: TranslatableText | string
    ): TextElement<T> {
        const element = this.assert(target, selectors) as T;
        return new TextElement(element, text);
    }
}