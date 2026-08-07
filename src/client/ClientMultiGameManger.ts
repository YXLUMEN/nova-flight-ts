import type {Consumer} from "../type/types.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {ClientStorage} from "./ClientStorage.ts";
import {error} from "@tauri-apps/plugin-log";
import {invoke} from "@tauri-apps/api/core";


export class ClientMultiGameManger {
    private static readonly LAN_POLL_MS = 1000;
    private static readonly LAN_STALE_MS = 5000;

    private readonly multiGame: HTMLDivElement;
    private readonly serverList: HTMLDivElement;
    private readonly addrInput: HTMLInputElement;
    private readonly connectBtn: HTMLButtonElement;
    private readonly cancelBtn: HTMLButtonElement;

    private resolveLast: Consumer<string | null> | null = null;
    private lanHint: HTMLDivElement | null = null;
    private lanTimer: ReturnType<typeof setInterval> | undefined;

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
        this.lanHint.textContent = '正在搜索局域网房间...';
        this.serverList.appendChild(this.lanHint);
    }

    public getServerAddress(): Promise<string | null> {
        this.show();
        this.cancelInput();
        void this.startLANPolling();

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
            if (target instanceof HTMLElement &&
                target.className === 'server-select' &&
                target.hasAttribute('data-id')
            ) {
                const id = target.getAttribute('data-id')!;
                const [_, addr, name] = id.split('-');
                target.remove();
                await ClientStorage.deleteServer(addr, name);
            }
        }, {signal});

        promise.finally(() => this.stopLANPolling());

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