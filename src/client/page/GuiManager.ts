import type {PageSection} from "./PageSection.ts";

export class GuiManager {
    private readonly root: HTMLElement;
    private readonly sections: PageSection[] = [];

    public constructor(root: HTMLElement) {
        this.root = root;
    }

    public top(): PageSection | null {
        return this.sections.length > 0 ? this.sections[this.sections.length - 1] : null;
    }

    public push(section: PageSection): PageSection {
        if (this.sections.includes(section)) return section;

        this.root.classList.remove('hidden');
        section.manager = this;

        this.sections.push(section);
        this.refresh();
        section.notifyOpened();
        return section;
    }

    public popTop(): PageSection | null {
        const section = this.sections.pop();
        if (!section) return null;

        this.release();
        this.refresh();
        section.manager = null;
        section.notifyClosed();
        return section;
    }

    public pop(section: PageSection): boolean {
        const index = this.sections.indexOf(section);
        if (index < 0) return false;

        this.sections.splice(index, 1);
        this.release();
        this.refresh();

        section.manager = null;
        section.notifyClosed();
        return true;
    }

    public clear() {
        while (this.popTop()) {
        }
    }

    public destroyAll() {
        while (true) {
            const section = this.popTop();
            if (!section) break;
            section.destroy();
        }
    }

    private refresh() {
        for (let i = 0; i < this.sections.length; i++) {
            this.sections[i].index(i);
        }
    }

    private release() {
        if (this.sections.length === 0) {
            this.root.classList.add('hidden');
        }
    }
}