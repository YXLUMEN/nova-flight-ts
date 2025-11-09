import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import {ServerReceive} from "./network/ServerReceive.ts";
import type {UUID} from "../apis/types.ts";

export class IntegratedServer extends NovaFlightServer {
    public static startServer(secretKey: Uint8Array, mainClientUUID: UUID) {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new IntegratedServer(secretKey, mainClientUUID);
        }

        return NovaFlightServer.instance;
    }

    public override async runServer(action: number): Promise<void> {
        const manager = new RegistryManager();
        await manager.registerAll();
        manager.frozen();

        ServerReceive.registryNetworkHandler(this.networkChannel);
        await this.startGame(manager, action === 1);
        await this.waitForStop();
    }

    public override onWorldStop(): Promise<void> {
        self.postMessage({type: 'server_stop'});
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

        self.postMessage({type: 'read_file'});

        timeOut = setTimeout(() => {
            endLoad(null);
        }, 5000);

        return promise;
    }

    public override async saveGame(compound: NbtCompound): Promise<void> {
        const bytes = compound.toRootBinary();
        self.postMessage({type: 'write_file', payload: bytes});
    }
}