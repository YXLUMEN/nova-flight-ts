import {ProtocolRegistry} from "../network/packet/ProtocolRegistry.ts";
import {IntegratedServer} from "../server/IntegratedServer.ts";
import type {StartServer} from "../type/startup.ts";
import {isDev} from "../configs/RuntimeConfig.ts";
import {Main2WorkerType, Worker2MainType} from "./WorkerMsgType.ts";

let server: IntegratedServer | null = null;
let pendingStop = false;

self.addEventListener('message', handleEvent);
self.postMessage({w2m: Worker2MainType.WORKER_READY});

async function handleEvent(event: MessageEvent) {
    const m2w = event.data.m2w as Main2WorkerType;
    if (m2w === undefined) return;

    switch (m2w) {
        case Main2WorkerType.START_SERVER: {
            if (server) return;
            const startUp = event.data.payload as StartServer;
            server = IntegratedServer.startServer(new Uint8Array(startUp.key), startUp.hostUUID, startUp.saveName) as IntegratedServer;
            server.networkChannel.setRemote(startUp.addr);
            return server.runServer();
        }
        case Main2WorkerType.STOP_SERVER: {
            if (!server || pendingStop) return;
            pendingStop = true;
            await server.halt();
            server = null;
            self.postMessage({w2m: Worker2MainType.SERVER_SHUTDOWN});
            break;
        }
        case Main2WorkerType.START_TICKING: {
            server?.setPause(false);
            break;
        }
        case Main2WorkerType.STOP_TICKING: {
            server?.setPause(true);
            break;
        }
        case Main2WorkerType.LOADED_SAVE_DATA:
            break;
        case Main2WorkerType.SAVE_ALL: {
            if (!server || !server.world) return;

            await server.playerManager.saveAllPlayerData();
            const nbt = server.world.saveAll();
            await server.saveWorld(nbt);
            self.postMessage({w2m: Worker2MainType.SAVED});
            break;
        }
        case Main2WorkerType.CD_ALL : {
            if (!isDev) return;

            if (!server || !server.world) return;
            const host = server.getHostUUID();
            const player = server.playerManager.getPlayer(host);
            player?.cdAllSpecials();
            break;
        }
    }
}

ProtocolRegistry.register();