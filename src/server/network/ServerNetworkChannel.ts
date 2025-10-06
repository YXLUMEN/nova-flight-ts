import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";

export class ServerNetworkChannel extends NetworkChannel {
    public constructor(ws: WebSocket) {
        super(ws, PayloadTypeRegistry.playS2C());
    }

    protected override getSide() {
        return 'server';
    }

    protected override getHeader() {
        return 0x11;
    }

    protected register() {
        this.ws.send(new Uint8Array([0x01]));
        console.log("Server registered");
    }
}