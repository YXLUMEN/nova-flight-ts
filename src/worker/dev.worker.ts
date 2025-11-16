import {ClientNetwork} from "../client/network/ClientNetwork.ts";
import {ServerNetwork} from "../server/network/ServerNetwork.ts";
import {DevServer} from "../server/DevServer.ts";

let server: DevServer | null = null;

self.addEventListener("message", handleEvent.bind(this));

async function handleEvent(event: MessageEvent<any>) {
    const {type, payload} = event.data;

    switch (type) {
        case 'start_server': {
            if (server) return;
            server = DevServer.startServer(payload.key, payload.clientId) as DevServer;
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
}

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
        case 'KeyH': {
            const world = server?.world;
            if (!world) return;
            for (const player of world.getPlayers()) player.setHealth(player.getMaxHealth());
            break;
        }
    }
}

ClientNetwork.registerNetworkPacket();
ServerNetwork.registerNetworkPacket();