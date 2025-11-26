import {ServerCommonNetworkHandler} from "./ServerCommonNetworkHandler.ts";
import {GameProfile} from "../entity/GameProfile.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";


export class ServerConfigurationNetworkHandler extends ServerCommonNetworkHandler {
    private readonly profile: GameProfile;

    public constructor(server: NovaFlightServer, channel: ServerNetworkChannel, profile: GameProfile) {
        super(server, channel);
        this.profile = profile;
    }


    protected override getProfile(): GameProfile {
        return this.profile;
    }
}