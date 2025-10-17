import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";

export class IntegratedServer extends NovaFlightServer {
    public static startServer() {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new IntegratedServer();
        }

        return NovaFlightServer.instance;
    }

    public override async runServer(action: number): Promise<void> {
        const manager = new RegistryManager();
        await manager.registerAll();
        manager.frozen();

        await this.startGame(manager, action === 1);
        await this.waitForStop();
    }

    public override onWorldStop(): Promise<void> {
        self.postMessage({type: 'server_shutdown'});
        return Promise.resolve();
    }

    public override loadSaves() {
        const {promise, resolve} = Promise.withResolvers<NbtCompound | null>();
        const ctrl = new AbortController();

        let timeOut: number;
        const endLoad = (nbt: NbtCompound | null) => {
            clearTimeout(timeOut);
            ctrl.abort();
            resolve(nbt);
        };

        self.addEventListener('message', event => {
            const {type, data} = event.data;
            if (type !== 'loaded_save_data') return;

            const nbt = data !== undefined ? NbtCompound.fromRootBinary(data) : null;
            endLoad(nbt);
        }, {signal: ctrl.signal});

        self.postMessage({type: 'load_save'});

        timeOut = setTimeout(() => {
            endLoad(null);
        }, 5000);

        return promise;
    }

    public override async saveGame(compound: NbtCompound): Promise<void> {
        const bytes = compound.toRootBinary();
        self.postMessage({type: "save_game", payload: bytes});
    }
}