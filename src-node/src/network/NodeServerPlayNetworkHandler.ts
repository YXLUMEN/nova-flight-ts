import {ServerPlayNetworkHandler} from "../../../src/server/network/ServerPlayNetworkHandler.ts";
import type {Session} from "./Session.ts";
import type {NovaFlightServer} from "../../../src/server/NovaFlightServer.ts";
import {ServerPlayerEntity} from "../../../src/server/entity/ServerPlayerEntity.ts";
import {BinaryReader} from "../../../src/nbt/BinaryReader.ts";
import {PayloadTypeRegistry} from "../../../src/network/PayloadTypeRegistry.ts";
import type {ServerChannel} from "../../../src/server/network/ServerChannel.ts";

export class NodeServerPlayNetworkHandler extends ServerPlayNetworkHandler {
    public constructor(server: NovaFlightServer, channel: ServerChannel, player: ServerPlayerEntity, session: Session) {
        super(server, channel, player);

        const handler = this.handleMessage.bind(this);
        session.ws.on('message', handler);
    }

    private handleMessage(buffer: Buffer): void {
        const reader = new BinaryReader(buffer);
        const header = reader.readUint8();
        if (header !== 0x10) {
            console.warn(`[Server] Receive unknown header: ${header}`);
            return;
        }

        reader.readUint8();
        const index = reader.readVarUint();
        const type = PayloadTypeRegistry.getGlobalByIndex(index);
        if (!type) return;

        const payload = type.codec.decode(reader);
        if (payload) this.handlePayload(payload);
    }
}