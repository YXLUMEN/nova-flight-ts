import {DevServer} from "./DevServer";

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
            break;
        }
        default:
            console.warn("Unknown message:", type);
    }
};
