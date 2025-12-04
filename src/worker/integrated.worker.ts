import {ClientNetwork} from "../client/network/ClientNetwork.ts";
import {ServerNetwork} from "../server/network/ServerNetwork.ts";
import {IntegratedServer} from "../server/IntegratedServer.ts";
import type {StartServer} from "../apis/startup.ts";
import {DevServer} from "../server/DevServer.ts";

let server: IntegratedServer | null = null;

self.addEventListener("message", handleEvent.bind(this));

async function handleEvent(event: MessageEvent) {
    const {type, payload} = event.data;

    switch (type) {
        case 'start_server': {
            if (server) return;
            const startUp = payload as StartServer;

            server = IntegratedServer.startServer(new Uint8Array(startUp.key), startUp.hostUUID, startUp.saveName) as DevServer;
            server.networkChannel.setServerAddress(startUp.addr);
            return server.runServer(startUp.action);
        }
        case 'stop_server': {
            if (!server) return;
            await server.stopGame();
            server = null;
            self.postMessage({type: 'server_shutdown'});
            break;
        }
        case 'start_ticking': {
            const world = server?.world;
            if (!world) return;
            world.setTicking(true);
            break;
        }
        case 'stop_ticking': {
            const world = server?.world;
            if (!world) return;
            world.setTicking(false);
            break;
        }
        case 'loaded_save_data':
            break;
        case 'save_all': {
            if (!server || !server.world) return;

            await server.playerManager.saveAllPlayerData();
            const nbt = server.world.saveAll();
            await server.saveGame(nbt);
            break;
        }
    }
}

ServerNetwork.registerNetworkPacket();
ClientNetwork.registerNetworkPacket();