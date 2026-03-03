import {shortUUID} from "../../utils/math/math.ts";

export abstract class Widget {
    protected readonly element: HTMLElement;
    protected readonly children = new Map<string, Widget>();
    protected parent: Widget | null = null;

    protected constructor(element: HTMLElement | string) {
        this.element = typeof element === 'string' ? document.createElement(element) : element;
    }

    public append(child: Widget): this {
        child.parent = this;

        this.children.set(child.getId(), child);
        this.element.append(child.element);
        return this;
    }

    protected appendElement(element: HTMLElement): void {
        this.element.append(element);
    }

    public remove(childId: string): this {
        const child = this.children.get(childId);
        if (child) {
            child.parent = null;
            child.element.remove();
            this.children.delete(childId);
        }

        return this;
    }

    public destroy(): void {
        this.children.forEach(child => child.destroy());
        this.children.clear();
        this.element.remove();
        this.parent = null;
    }

    public getChild(childId: string) {
        return this.children.get(childId);
    }

    public getId() {
        let id = this.element.dataset.id;
        if (id === undefined) {
            id = `${shortUUID()}-${Date.now()}`;
            this.element.dataset.id = id;
        }

        return id;
    }

    public render(): void {
    }
}