import type {Consumer} from "../type/types.ts";
import {error} from "@tauri-apps/plugin-log";
import {invoke} from "@tauri-apps/api/core";
import {as, assert, bindFrom} from "../utils/dom_util.ts";
import {empty} from "../utils/uit.ts";
import {appEvent} from "../event/EventBus.ts";
import {ClientStorage} from "./storage/ClientStorage.ts";
import {PageSection} from "./page/PageSection.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";

export class ClientMultiGameManger extends PageSection {
    private static readonly LAN_POLL_MS = 1000;
    private static readonly LAN_STALE_MS = 5000;

    private readonly serverList: HTMLElement;
    private readonly addrInput: HTMLInputElement;
    private readonly connectBtn: HTMLElement;
    private readonly cancelBtn: HTMLElement;

    private commit: Consumer<string | null> = empty;
    private lanHint: HTMLDivElement | null = null;
    private lanTimer: ReturnType<typeof setInterval> | undefined;

    public constructor() {
        super('multi-game');

        this.closeOnEscape = true;

        this.serverList = assert(this.root, '.server-list');
        this.addrInput = as(this.root, '#server-address', HTMLInputElement);
        this.connectBtn = assert(this.root, '.confirm-btn');
        this.cancelBtn = assert(this.root, '.cancel-btn');

        const bind = bindFrom(this.root);
        appEvent.on('ui:lang', () => bind.refresh());
        bind.refresh();

        this.loadDB().catch(console.error);
    }

    protected override onClosed() {
        this.commit(null);
        this.commit = empty;
    }

    public getServerAddress(): Promise<string | null> {
        if (!this.manager) return Promise.resolve(null);

        this.commit(null);
        void this.startLANPolling();

        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();
        const signal = ctrl.signal;
        const release = this.manager.input.requireInput();

        const commit = (result: string | null) => {
            resolve(result);
            ctrl.abort();
            release();
            this.commit = empty;
            this.close();
        };
        this.commit = commit;

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

            commit(addr);
        }, {signal});

        this.cancelBtn.addEventListener('click', () => {
            this.commit(null);
            this.close();
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

        this.serverList.addEventListener('auxclick', event => {
            const target = event.target;
            if (target instanceof HTMLElement &&
                target.className === 'server-select' &&
                target.hasAttribute('data-id')
            ) {
                const id = target.getAttribute('data-id')!;
                const [_, addr, name] = id.split('-');
                target.remove();
                void ClientStorage.deleteServer(addr, name);
            }
        }, {signal});

        promise.finally(() => this.stopLANPolling());

        return promise;
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

    private async loadLANRooms() {
        try {
            await this.scanLAN();

            const rooms = await invoke<LanServer[]>('list_lan_servers');
            const now = Temporal.Now.instant().epochMilliseconds;

            this.serverList.querySelectorAll<HTMLDivElement>('[data-lan]')
                .forEach(el => el.remove());

            const frag = document.createDocumentFragment();
            for (const room of rooms) {
                if (now - room.last_seen_ms > ClientMultiGameManger.LAN_STALE_MS) continue;

                const element = this.createServerSelect(room.addr, room.name);
                element.setAttribute('data-lan', '');
                frag.appendChild(element);
            }

            this.serverList.insertBefore(frag, this.lanHint);
        } catch (err) {
            console.warn('[Client] Fail to list LAN servers', err);
        }
    }

    private async scanLAN() {
        try {
            const scanning = await invoke<boolean>('is_lan_sniffing');
            if (scanning) return;
            await invoke('start_lan_sniff');
        } catch (err) {
            console.warn('[Client] Fail to open scanner', err);
        }
    }

    private async startLANPolling() {
        await this.stopLANPolling();
        this.showSearchHint();
        await this.loadLANRooms();

        this.lanTimer = setInterval(() => this.loadLANRooms(), ClientMultiGameManger.LAN_POLL_MS);
    }

    private async stopLANPolling() {
        const running = await invoke<boolean>('is_lan_sniffing');
        const success = await invoke<boolean>('stop_lan_sniff');

        clearInterval(this.lanTimer);
        this.lanTimer = undefined;

        this.lanHint?.remove();
        this.lanHint = null;
        this.serverList.querySelectorAll<HTMLDivElement>('[data-lan="true"]')
            .forEach(el => el.remove());

        const msg = running ? success ? 'Success' : 'Fail' : 'Inactive';
        console.log('[Client] MultiGame stop sniffing', msg);
    }

    private showSearchHint() {
        if (this.lanHint) return;

        this.lanHint = document.createElement('div');
        this.lanHint.classList.add('server-list-hint');
        this.lanHint.textContent = TranslatableText.of('multiplayer.hint').toString();
        this.serverList.appendChild(this.lanHint);
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

        select.append(nameSpan, addrSpan);
        select.setAttribute('data-id', `server-${addr}-${name}`);

        return select;
    }
}

interface ServerSelect {
    addr: string;
    name: string;
    id: number;
}

interface LanServer {
    name: string;
    addr: string;
    game_version: number;
    last_seen_ms: number;
}