import type {Consumer} from "../apis/types.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {ClientDB} from "./ClientDB.ts";

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

        ClientDB.db.getAll<ServerSelect>('server-addr-list')
            .then(serverList => {
                serverList.forEach(each => {
                    this.serverList.appendChild(ClientMultiGameManger.createServerSelect(each.addr, each.name));
                });
            });
    }

    public getServerAddress(): Promise<string | null> {
        this.show();
        this.cancelInput();

        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();

        this.resolveLast = (result: string | null) => {
            if (ctrl.signal.aborted) return;

            resolve(result);
            ctrl.abort();
            this.resolveLast = null;
        };

        this.connectBtn.addEventListener('click', async () => {
            const addr = this.addrInput.value.trim();
            if (addr.length === 0) return;

            const select = ClientMultiGameManger.createServerSelect(addr, '服务器');
            const id = select.id;
            if (!document.getElementById(id)) {
                const [_, addr, name] = id.split('-');
                this.serverList.appendChild(select);
                await ClientDB.db.add('server-addr-list', {addr, name});
            }

            this.resolveLast?.(addr);
        }, {signal: ctrl.signal});

        this.cancelBtn.addEventListener('click', () => {
            this.cancelInput();
            this.hide();
        }, {signal: ctrl.signal});

        this.serverList.addEventListener('click', event => {
            const target = event.target;
            if (target instanceof HTMLElement && target.className === 'server-select') {
                const [_, addr, _name] = target.id.split('-');
                this.addrInput.value = addr;
            }
        }, {signal: ctrl.signal});

        this.serverList.addEventListener('auxclick', async event => {
            const target = event.target;
            if (target instanceof HTMLElement && target.className === 'server-select') {
                const [_, addr, name] = target.id.split('-');
                target.remove();
                await ClientDB.deleteServer(addr, name);
            }
        }, {signal: ctrl.signal});

        return promise;
    }

    public cancelInput(): void {
        this.resolveLast?.(null);
    }

    public show(): void {
        NovaFlightClient.getInstance().input.setDisabled(true);
        this.multiGame.classList.remove('hidden');
    }

    public hide(): void {
        NovaFlightClient.getInstance().input.setDisabled(false);
        this.multiGame.classList.add('hidden');
    }

    private static createServerSelect(addr: string, name: string): HTMLDivElement {
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
        select.id = `server-${addr}-${name}`;

        return select;
    }
}