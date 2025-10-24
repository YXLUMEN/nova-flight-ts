import type {ClientPlayNetworkHandler} from "../network/ClientPlayNetworkHandler.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import type {UUID} from "../../apis/types.ts";
import type {CommandSource} from "../../command/CommandSource.ts";
import type {World} from "../../world/World.ts";

export class ClientCommandSource implements CommandSource {
    private readonly networkHandler: ClientPlayNetworkHandler;
    private readonly client: NovaFlightClient;

    public constructor(networkHandler: ClientPlayNetworkHandler, client: NovaFlightClient) {
        this.networkHandler = networkHandler;
        this.client = client;
    }

    public getPlayerNames(): UUID[] {
        return this.networkHandler.getPlayerList().toArray();
    }

    public getWorld(): World | null {
        return this.client.world;
    }

    public getClient() {
        return this.client;
    }
}