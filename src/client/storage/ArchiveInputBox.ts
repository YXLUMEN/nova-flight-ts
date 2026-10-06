import {PageSection} from "../page/PageSection.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import {message} from "@tauri-apps/plugin-dialog";
import {as, assert, closest, dataAction} from "../../utils/dom_util.ts";
import type {Consumer} from "../../type/types.ts";

export class ArchiveInputBox extends PageSection {
    private readonly inputBar: HTMLInputElement;
    private readonly buttons: HTMLElement;

    private commit: Consumer<string | null> | null = null;

    public constructor() {
        super('save-name-label');

        this.inputBar = as(this.root, '#save-name-input', HTMLInputElement);
        this.buttons = assert(this.root, '#save-name-buttons');
    }

    protected override onClosed() {
        this.commit?.(null);
        this.commit = null;
    }

    public input(): Promise<string | null> {
        this.commit?.(null);
        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();

        this.inputBar.value = 'New World';
        NovaFlightClient.instance().input.startInput(true);

        const commit = (result: string | null) => {
            NovaFlightClient.instance().input.startInput(false);
            resolve(result);
            ctrl.abort();
            this.commit = null;
            this.close();
        };
        this.commit = commit;

        this.buttons.addEventListener('click', event => {
            const actionBtn = closest(event.target, '.c-button');
            const action = dataAction(actionBtn);
            if (!action) return;

            if (action === 'confirm') {
                const input = this.inputBar.value.trim();
                if (input.length === 0) {
                    void message('输入不能为空', {kind: 'warning'});
                    return;
                }
                commit(input);
            } else if (action === 'cancel') {
                commit(null);
            }
        }, {signal: ctrl.signal});

        return promise;
    }
}