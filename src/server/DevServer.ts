import {NovaFlightServer} from "./NovaFlightServer.ts";
import {IntegratedServer} from "./IntegratedServer.ts";

export class DevServer extends IntegratedServer {
    private willCrash = 0;
    private restCrash: number | null = null;

    public static startServer() {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new DevServer();
        }

        return NovaFlightServer.instance;
    }

    public debugCrash() {
        if (this.willCrash++ >= 5) {
            this.world = null;
            return;
        }
        console.warn(`Will crash: ${this.willCrash}`);

        if (this.restCrash !== null) clearTimeout(this.restCrash);
        this.restCrash = setTimeout(() => {
            this.willCrash = 0;
            this.restCrash = null;
        }, 5000);
    }
}
