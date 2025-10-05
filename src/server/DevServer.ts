import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";

export class DevServer extends NovaFlightServer {
    public static startServer() {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new DevServer();
        }

        return NovaFlightServer.instance;
    }

    public async runServer(manager: RegistryManager, action: number): Promise<void> {
        await this.startGame(manager, action === 1);
        await this.waitForStop();
    }
}
