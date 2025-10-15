import {ClientNetwork} from "../client/network/ClientNetwork.ts";
import {ServerNetwork} from "../server/network/ServerNetwork.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {IntegratedServer} from "../server/IntegratedServer.ts";

let server: IntegratedServer | null = null;

self.onmessage = async (event: MessageEvent) => {
    const {type, payload} = event.data;

    switch (type) {
        case 'start_server': {
            if (server) return;
            server = IntegratedServer.startServer() as IntegratedServer;
            return server.runServer(payload.action);
        }
        case 'stop_server': {
            if (server) {
                await server.stopGame();
                server = null;
                self.postMessage({type: 'stopped'});
            }
            break;
        }
        case 'start_ticking': {
            server?.world?.setTicking(true);
            break;
        }
        case 'stop_ticking': {
            server?.world?.setTicking(false);
            break;
        }
        case 'switch_dev_mode': {
            WorldConfig.devMode = !WorldConfig.devMode;
            WorldConfig.usedDevMode = true;
            break;
        }
        case 'loaded_save_data':
            break;
        default:
            console.warn('Unknown message: ', type);
    }
};

ClientNetwork.registerNetworkPacket();
ServerNetwork.registerNetworkPacket();