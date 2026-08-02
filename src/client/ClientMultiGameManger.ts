import type {Consumer} from "../type/types.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {ClientStorage} from "./ClientStorage.ts";
import {error} from "@tauri-apps/plugin-log";
import {invoke} from "@tauri-apps/api/core";

interface ServerSelect {
    addr: string;
    name: string;
    id: number;
}

export class ClientMultiGameManger {
    private readonly multiGame: HTMLDivElement;
    private readonly serverList: HTMLDivElement;
    private readonly addrInput: HTMLInputElement;
    private readonly connectBtn: HTMLButtonElement;
    private readonly cancelBtn: HTMLButtonElement;

    private resolveLast: Consumer<string | null> | null = null;

    public constructor() {
        this.multiGame = document.getElementById('multi-game') as HTMLDivElement;
        this.serverList = document.getElementById('server-list') as HTMLDivElement;
        this.addrInput = document.getElementById('server-address') as HTMLInputElement;
        this.connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
        this.cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

        this.loadDB().catch(console.error);
    }

    private async loadDB() {
        const result = await ClientStorage.db.getAll<ServerSelect>('server_addr_list');
        if (result.isErr()) {
            await error(String(result.unwrapErr()));
            return;
        }

        const list = result.unwrap();
        const frag = document.createDocumentFragment();
        for (const item of list) {
            const element = this.createServerSelect(item.addr, item.name);
            frag.appendChild(element);
        }

        this.serverList.appendChild(frag);
    }

    private async scanLAN() {
        try {
            await invoke('start_lan_sniff');
        } catch (err) {
            console.warn('[Client] Fail to open scanner', err);
        }
    }

    public getServerAddress(): Promise<string | null> {
        this.show();
        this.cancelInput();
        void this.scanLAN();

        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();
        const signal = ctrl.signal;

        this.resolveLast = (result: string | null) => {
            if (signal.aborted) return;

            resolve(result);
            ctrl.abort();
            this.resolveLast = null;
        };

        this.connectBtn.addEventListener('click', async () => {
            const addr = this.addrInput.value.trim();
            if (addr.length === 0) return;

            const select = this.createServerSelect(addr, '服务器');
            const id = select.getAttribute('data-id')!;

            const exist = this.serverList.querySelector(`[data-id="${id}"]`);
            if (!exist) {
                const [_, addr, name] = id.split('-');
                this.serverList.appendChild(select);
                await ClientStorage.db.add('server_addr_list', {addr, name});
            }

            this.resolveLast?.(addr);
        }, {signal});

        this.cancelBtn.addEventListener('click', () => {
            this.cancelInput();
            this.hide();
        }, {signal});

        this.serverList.addEventListener('click', event => {
            const target = event.target;
            if (target instanceof HTMLElement && target.className === 'server-select') {
                const id = target.getAttribute('data-id');
                if (!id) {
                    this.addrInput.value = '<empty>';
                    return;
                }

                const [_, addr, _name] = id.split('-');
                this.addrInput.value = addr;
            }
        }, {signal});

        this.serverList.addEventListener('auxclick', async event => {
            const target = event.target;
            if (target instanceof HTMLElement && target.className === 'server-select') {
                const [_, addr, name] = target.id.split('-');
                target.remove();
                await ClientStorage.deleteServer(addr, name);
            }
        }, {signal});

        promise.finally(() => invoke('stop_lan_sniff'));

        return promise;
    }

    public cancelInput(): void {
        this.resolveLast?.(null);
    }

    public show(): void {
        NovaFlightClient.getInstance().input.setHandlerDisabled(true);
        this.multiGame.classList.remove('hidden');
    }

    public hide(): void {
        NovaFlightClient.getInstance().input.setHandlerDisabled(false);
        this.multiGame.classList.add('hidden');
    }

    private createServerSelect(addr: string, name: string): HTMLDivElement {
        const select = document.createElement('div');
        select.classList.add('server-select');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('name');
        nameSpan.textContent = name;

        const addrSpan = document.createElement('span');
        addrSpan.classList.add('addr');
        addrSpan.textContent = addr;

        select.appendChild(nameSpan);
        select.appendChild(addrSpan);
        select.setAttribute('data-id', `server-${addr}-${name}`);

        return select;
    }
}