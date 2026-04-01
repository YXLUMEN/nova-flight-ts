import type {UUID} from "../../../src/type/types.ts";
import {WebSocket} from "ws";

export class Session {
    public readonly ws: WebSocket;
    public readonly ip: string;
    public readonly uuid: UUID;
    public readonly sessionId: number;

    public constructor(ws: WebSocket, ip: string, uuid: UUID, sessionId: number) {
        this.ws = ws;
        this.ip = ip;
        this.uuid = uuid;
        this.sessionId = sessionId;
    }

    public isConnected() {
        return this.ws.readyState === WebSocket.OPEN;
    }

    public send(buffer: ArrayBufferLike | Uint8Array) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(buffer);
        }
    }
}