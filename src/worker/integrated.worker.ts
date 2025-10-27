import {ClientNetwork} from "../client/network/ClientNetwork.ts";
import {ServerNetwork} from "../server/network/ServerNetwork.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {IntegratedServer} from "../server/IntegratedServer.ts";

let server: IntegratedServer | null = null;

self.addEventListener("message", handleEvent.bind(this));

async function handleEvent(event: MessageEvent) {
    const {type, payload} = event.data;

    switch (type) {
        case 'start_server': {
            if (server) return;
            server = IntegratedServer.startServer() as IntegratedServer;
            server.networkChannel.setServerAddress(payload.addr);
            return server.runServer(payload.action);
        }
        case 'stop_server': {
            if (server) {
                await server.stopGame();
                server = null;
                self.postMessage({type: 'server_shutdown'});
            }
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
        case 'switch_dev_mode': {
            WorldConfig.devMode = !WorldConfig.devMode;
            WorldConfig.usedDevMode = true;
            break;
        }
        case 'loaded_save_data':
            break;
    }
}


ClientNetwork.registerNetworkPacket();
ServerNetwork.registerNetworkPacket();