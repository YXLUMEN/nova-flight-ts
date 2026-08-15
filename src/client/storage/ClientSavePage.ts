import {GeneralEventBus} from "../../event/GeneralEventBus.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";

export class ClientSavePage {
    private readonly texts: TranslatableText[];
    private readonly title: HTMLElement;
    private readonly actions: HTMLElement;
    private readonly archiveName: HTMLElement;
    private readonly confirms: HTMLElement;

    public constructor() {
        this.title = document.getElementById('archive-title')!;
        this.actions = document.getElementById('start-buttons')!;
        this.archiveName = document.getElementById('archive-name')!;
        this.confirms = document.getElementById('save-name-buttons')!;

        this.texts = [
            TranslatableText.of('archive.title'),
            TranslatableText.of('archive.back'),
            TranslatableText.of('archive.create'),
            TranslatableText.of('archive.load'),
            TranslatableText.of('archive.delete'),
            TranslatableText.of('archive.rename'),
            TranslatableText.of('archive.export'),
            TranslatableText.of('archive.export_snbt'),
            TranslatableText.of('archive.import'),
            TranslatableText.of('archive.archive_name'),
            TranslatableText.of('archive.confirm'),
            TranslatableText.of('archive.cancel'),
        ];

        this.updateText = this.updateText.bind(this);
        this.registerEvent();
    }

    public registerEvent() {
        GeneralEventBus.getEventBus().off('res:lang', this.updateText);
        GeneralEventBus.getEventBus().on('res:lang', this.updateText);
    }

    private updateText() {
        let index = 0;
        this.title.textContent = this.texts[index++].toString();
        for (const child of this.actions.children) {
            child.textContent = this.texts[index++].toString();
        }

        this.archiveName.textContent = this.texts[index++].toString();
        for (const child of this.confirms.children) {
            child.textContent = this.texts[index++].toString();
        }
    }
}