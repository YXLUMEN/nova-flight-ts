import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {ServerFinishConfigS2CPacket} from "../../../network/packet/config/ServerFinishConfigS2CPacket.ts";
import type {RequireLoginS2CPacket} from "../../../network/packet/config/RequireLoginS2CPacket.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import {PlayProtocol} from "../../../network/protocol/PlayProtocol.ts";
import {ClientStartPlayC2SPacket} from "../../../network/packet/config/ClientStartPlayC2SPacket.ts";
import {ClientStorage} from "../../storage/ClientStorage.ts";
import {LoginC2SPacket} from "../../../network/packet/config/LoginC2SPacket.ts";
import type {UUID} from "../../../type/types.ts";

export class ClientConfigHandler extends ClientCommonHandler {
    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection, ConnectionState.CONFIGURATION);
    }

    public async onRequireLogin(_: RequireLoginS2CPacket) {
        const result = await ClientStorage.db.get<KeyRecord>('account', this.client.clientId);
        const record = result.unwrap();
        if (record) {
            this.send(new LoginC2SPacket(record.key));
            return;
        }

        const newKey = crypto.getRandomValues(new Uint8Array(32));
        const insertResult = await ClientStorage.db.add('account', {
            uuid: this.client.clientId,
            key: newKey,
        });
        insertResult.unwrap();
        this.send(new LoginC2SPacket(newKey));
    }

    public onFinishConfig(_: ServerFinishConfigS2CPacket) {
        this.send(ClientStartPlayC2SPacket.INSTANCE);
        this.connection.setInbound(PlayProtocol.SERVER_BOUND, this.client.networkHandler);
        this.connection.setOutBound(PlayProtocol.CLIENT_BOUND);
    }

    public override accept(payload: Payload) {
        if (payload.protocol?.() !== this.getPhase()) return;
        super.accept(payload);
    }
}

interface KeyRecord {
    uuid: UUID;
    key: Uint8Array<ArrayBuffer>;
}