import {ClientNetwork} from "../client/network/ClientNetwork.ts";
import {ServerNetwork} from "../server/network/ServerNetwork.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {DevServer} from "../server/DevServer.ts";

let server: DevServer | null = null;

self.onmessage = async (event: MessageEvent) => {
    const {type, payload} = event.data;

    switch (type) {
        case 'start_server': {
            if (server) return;
            server = DevServer.startServer() as DevServer;
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
        case 'dev_mode': {
            handleDev(payload.code);
            break;
        }
        case 'loaded_save_data':
            break;
        case 'crash_the_server':
            server?.debugCrash();
            break;
        default:
            console.warn('Unknown message: ', type);
    }
};

function handleDev(key: string) {
    switch (key) {
        case 'KeyF': {
            const world = server?.world;
            if (!world) return;
            world.freeze = !world.freeze;
            break;
        }
        case 'KeyL': {
            const world = server?.world;
            if (!world) return;
            world.stage.nextPhase();
            break;
        }
        case 'KeyC': {
            const world = server?.world;
            if (!world) return;
            world.peaceMod = !world.peaceMod;
            world.getMobs().forEach(mob => mob.discard());
        }
    }
}

ClientNetwork.registerNetworkPacket();
ServerNetwork.registerNetworkPacket();