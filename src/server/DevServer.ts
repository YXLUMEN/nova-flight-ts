import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";

export class DevServer extends NovaFlightServer {
    public static startServer() {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new DevServer();
        }

        return NovaFlightServer.instance;
    }

    public override async runServer(action: number): Promise<void> {
        const manager = new RegistryManager();
        await manager.registerAll();
        manager.frozen();

        await this.startGame(manager, action === 1);
        await this.waitForStop();
    }
}
