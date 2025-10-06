import {DevServer} from "../server/DevServer.ts";
import {ClientNetwork} from "../client/network/ClientNetwork.ts";
import {ServerNetwork} from "../server/network/ServerNetwork.ts";

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
        default:
            console.warn("Unknown message:", type);
    }
};

ClientNetwork.registerNetworkPacket();
ServerNetwork.registerNetworkPacket();