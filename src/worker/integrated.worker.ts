import {ClientPackets} from "../client/network/ClientPackets.ts";
import {ServerPackets} from "../server/network/ServerPackets.ts";
import {IntegratedServer} from "../server/IntegratedServer.ts";
import type {StartServer} from "../type/startup.ts";
import {RelayPackets} from "../network/RelayPackets.ts";

let server: IntegratedServer | null = null;
let pendingStop = false;

self.addEventListener("message", handleEvent.bind(this));

async function handleEvent(event: MessageEvent) {
    const {type, payload} = event.data;

    switch (type) {
        case 'start_server': {
            if (server) return;
            const startUp = payload as StartServer;

            server = IntegratedServer.startServer(new Uint8Array(startUp.key), startUp.hostUUID, startUp.saveName) as IntegratedServer;
            server.networkChannel.setServerAddress(startUp.addr);
            return server.runServer();
        }
        case 'stop_server': {
            if (!server || pendingStop) return;
            pendingStop = true;
            await server.halt();
            server = null;
            self.postMessage({type: 'server_shutdown'});
            break;
        }
        case 'start_ticking': {
            server?.setPause(false);
            break;
        }
        case 'stop_ticking': {
            server?.setPause(true);
            break;
        }
        case 'loaded_save_data':
            break;
        case 'save_all': {
            if (!server || !server.world) return;

            await server.playerManager.saveAllPlayerData();
            const nbt = server.world.saveAll();
            await server.saveWorld(nbt);
            self.postMessage({type: 'saved'});
            break;
        }
        case 'cd_all' : {
            if (!server || !server.world) return;
            const host = server.getHostUUID();
            const player = server.playerManager.getPlayer(host);
            player?.cdAllSpecials();
        }

    }
}

RelayPackets.registerNetworkPacket();
ServerPackets.registerNetworkPacket();
ClientPackets.registerNetworkPacket();