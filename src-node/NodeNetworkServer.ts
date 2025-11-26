import {WebSocket, WebSocketServer} from 'ws';
import {SessionAllocator} from "./SessionAllocator";

export class NodeNetworkServer {
    private readonly wss: WebSocketServer;
    private readonly nextSessionId = new SessionAllocator();
    private readonly clients: Map<number, WebSocket> = new Map();

    public constructor(port: number) {
        this.wss = new WebSocketServer({port});

        this.wss.on('connection', ws => {
            const sessionId = this.nextSessionId.allocate();
            if (!sessionId) {
                ws.close();
                return;
            }

            this.clients.set(sessionId, ws);
        });
    }
}