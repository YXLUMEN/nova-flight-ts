import {DevServer} from "../server/DevServer.ts";
import {ClientNetwork} from "../client/network/ClientNetwork.ts";
import {ServerNetwork} from "../server/network/ServerNetwork.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";

let server: DevServer | null = null;

self.onmessage = async (event: MessageEvent) => {
    const {type, payload} = event.data;

    switch (type) {
        case "start": {
            server = DevServer.startServer() as DevServer;
            await server.runServer(payload.action);
            self.postMessage({type: "started"});
            break;
        }
        case "stop": {
            if (server) {
                await server.stopGame();
                self.postMessage({type: "stopped"});
            }
            server = null;
            break;
        }
        case 'start_ticking': {
            if (server) {
                server.world?.setTicking(true);
            }
            break;
        }
        case "stop_ticking": {
            if (server) {
                server.world?.setTicking(false);
            }
            break;
        }
        case 'switch_dev_mode': {
            WorldConfig.devMode = !WorldConfig.devMode;
            WorldConfig.usedDevMode = true;
            break;
        }
        case 'dev_mode': {
            switch (payload.code) {
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
                }
            }
            break;
        }
        default:
            console.warn("Unknown message:", type);
    }
};

ClientNetwork.registerNetworkPacket();
ServerNetwork.registerNetworkPacket();