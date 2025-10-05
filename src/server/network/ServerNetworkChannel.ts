import {NetworkChannel} from "../../network/NetworkChannel.ts";
import type {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {ServerReceive} from "./ServerReceive.ts";

export class ServerNetworkChannel extends NetworkChannel {
    public constructor(ws: WebSocket, registry: PayloadTypeRegistry) {
        super(ws, registry);
    }

    protected override getSide() {
        return 'server';
    }

    protected override getHeader() {
        return 0x11;
    }

    protected register() {
        this.ws.send(new Uint8Array([0x01]));
        ServerReceive.registryNetworkHandler(this);
        console.log("Server registered");
    }
}