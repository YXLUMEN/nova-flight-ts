import type {PageSplicerConfig} from "./PageSplicerConfig.ts";
import {PromisePool} from "../../utils/collection/PromisePool.ts";
import {sleep} from "../../utils/uit.ts";

// noinspection ExceptionCaughtLocallyJS
export class PageSplicer {
    private readonly config: PageSplicerConfig;
    private readonly pool: PromisePool;
    private deferCount = 0;

    public constructor(config: PageSplicerConfig) {
        this.config = config;
        this.pool = new PromisePool(config.concurrency);
        this.loadPage = this.loadPage.bind(this);
    }

    public bootstrap(root: HTMLElement): Promise<void> {
        return this.parseNode(root, this.config.basePath);
    }

    private async parseNode(node: HTMLElement, parentPath: string | null): Promise<void> {
        const tasks: Promise<void>[] = [];
        const pages = Array.from(node.getElementsByTagName('page'));

        for (const page of pages) {
            if (!(page instanceof HTMLElement)) {
                throw new Error('Page must be a HTMLElement');
            }

            const name = page.getAttribute('name');
            if (!name) throw new Error('<page> tag requires a "name" attribute');

            if (page.hasAttribute('defer')) {
                const timeout = this.config.deferTimeoutBase + this.deferCount * 20;

                this.deferCount++;
                requestIdleCallback(async () => {
                    await this.pool.submit(this.loadPage, page, name, parentPath);
                    this.deferCount--;
                }, {timeout});
                continue;
            }

            tasks.push(this.pool.submit(this.loadPage, page, name, parentPath));
        }

        await Promise.allSettled(tasks);
    }

    private async loadPage(page: HTMLElement, name: string, parentPath: string | null): Promise<void> {
        const url = this.resolve(name, parentPath);
        const parentNode = page.parentNode;

        try {
            const html = await this.tryFetch(url);
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const content = doc.body.firstElementChild;
            if (!(content instanceof HTMLElement) || content.tagName === 'PAGE') {
                throw new Error(`Invalid HTML structure in ${url}`);
            }

            content.setAttribute('data-page-path', url);
            page.replaceWith(content);

            const selfPath = this.getParentPath(name, parentPath);
            await this.parseNode(content, selfPath);
        } catch (e) {
            console.error(`[PageSplicer] Load Fail: ${url}`, e);

            const div = document.createElement('div');
            div.className = 'page-sys-err';
            div.textContent = 'Failed to load page';

            if (parentNode) {
                parentNode.insertBefore(div, page.nextSibling);
            } else {
                console.warn('[PageSplicer] Cannot display error: <page> has no parent');
            }
        } finally {
            if (parentNode) page.remove();
        }
    }

    private async tryFetch(url: string): Promise<string> {
        let lastError: unknown;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await this.fetch(url);
            } catch (e) {
                lastError = e;
                if (attempt >= this.config.maxRetries) break;
                await sleep(300 * Math.pow(3, attempt));
            }
        }

        throw lastError;
    }

    private async fetch(url: string): Promise<string> {
        const {fetchTimeout} = this.config;

        if (fetchTimeout <= 0) {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.text();
        }

        const resp = await fetch(url, {
            signal: AbortSignal.timeout(fetchTimeout),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.text();
    }

    private resolve(name: string, parent: string | null): string {
        const isDir = name.endsWith('/');
        const cleanName = isDir ? name.slice(0, -1) : name;
        const fileName = isDir ? `${cleanName}/index.html` : `${cleanName}.html`;
        return parent === null ? `/${fileName}` : `/${parent}/${fileName}`;
    }

    private getParentPath(name: string, parentPath: string | null): string {
        const cleanName = name.endsWith('/') ? name.slice(0, -1) : name;
        return parentPath === null ? cleanName : `${parentPath}/${cleanName}`;
    }
}