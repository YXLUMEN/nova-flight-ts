import type {StartServer} from "../type/startup.ts";
import {isDev} from "../configs/RuntimeConfig.ts";
import {ProtocolRegistry} from "../network/packet/ProtocolRegistry.ts";
import {IntegratedServer} from "../server/IntegratedServer.ts";
import {Main2WorkerType, Worker2MainType} from "./WorkerMsgType.ts";
import {Log} from "./log.ts";

let server: IntegratedServer | null = null;
let pendingStop = false;

self.addEventListener('message', handleEvent);
self.postMessage({w2m: Worker2MainType.WORKER_READY});

async function handleEvent(event: MessageEvent) {
    if (isDev) devFunc(event.data.dev);

    const m2w = event.data.m2w as Main2WorkerType;
    if (m2w === undefined) return;

    switch (m2w) {
        case Main2WorkerType.START_SERVER: {
            if (server || pendingStop) return;

            const startUp = event.data.payload as StartServer;
            server = IntegratedServer.startServer(new Uint8Array(startUp.key), startUp.hostUUID, startUp.saveName) as IntegratedServer;
            server.networkChannel.setRemote(startUp.addr);
            server.runServer().catch(err => {
                Log.error(`[Server] Error occurrence while loading resources, cause by "${err}"`);
                shutdown(err);
            });
            return;
        }
        case Main2WorkerType.STOP_SERVER: {
            void shutdown();
            return;
        }
        case Main2WorkerType.START_TICKING: {
            server?.setPause(false);
            return;
        }
        case Main2WorkerType.STOP_TICKING: {
            server?.setPause(true);
            return;
        }
        case Main2WorkerType.LOADED_SAVE_DATA:
            return;
        case Main2WorkerType.SAVE_ALL: {
            if (!server || !server.world) return;

            await server.playerManager.saveAllPlayerData();
            const nbt = server.world.saveAll();
            await server.saveWorld(nbt);
            self.postMessage({w2m: Worker2MainType.SAVED});
            return;
        }
    }
}

async function shutdown(reason?: any): Promise<void> {
    if (pendingStop) return;
    pendingStop = true;

    await server?.halt();
    server = null;

    self.postMessage({w2m: Worker2MainType.SERVER_SHUTDOWN, reason});
    console.log('[Server] Worker close.');
}

function devFunc(code: string) {
    if (!server || !server.world) return;

    switch (code) {
        case 'cd_all': {
            const host = server.getHostUUID();
            server.playerManager.getPlayer(host)?.cdAllSpecials();
            break;
        }
        case 'health': {
            const host = server.getHostUUID();
            const player = server.playerManager.getPlayer(host);
            if (!player) return;
            player.setHealth(player.getMaxHealth());
            break;
        }
    }
}

ProtocolRegistry.register();