import type {ClientNetworkHandler} from "../network/ClientNetworkHandler.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {CommandSource} from "../../command/CommandSource.ts";
import type {World} from "../../world/World.ts";

export class ClientCommandSource extends CommandSource {
    private readonly networkHandler: ClientNetworkHandler;
    private readonly client: NovaFlightClient;

    public constructor(networkHandler: ClientNetworkHandler, client: NovaFlightClient) {
        super();
        this.networkHandler = networkHandler;
        this.client = client;
    }

    public getPlayerNames(): Iterable<string> {
        return this.networkHandler.getPlayerList().map(profile => profile.name);
    }

    public getWorld(): World | null {
        return this.client.world;
    }

    public getClient() {
        return this.client;
    }

    public addMessage(message: string): void {
        this.client.clientCommandManager.addPlainMessage(message);
    }

    public hasPermissionLevel(level: number): boolean {
        const player = this.client.player;
        return player === null ? level === 0 : player.hasPermissionLevel(level);
    }
}