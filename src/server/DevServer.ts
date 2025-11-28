import {NovaFlightServer} from "./NovaFlightServer.ts";
import {IntegratedServer} from "./IntegratedServer.ts";
import type {UUID} from "../apis/types.ts";

export class DevServer extends IntegratedServer {
    private willCrash = 0;
    private restCrash: number | undefined = undefined;

    public static startServer(secretKey: Uint8Array, hostUUID: UUID, saveName: string) {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new DevServer(secretKey, hostUUID, saveName);
        }

        return NovaFlightServer.instance;
    }

    public debugCrash() {
        if (this.willCrash++ >= 5) {
            (this.world as any) = null;
            return;
        }
        console.warn(`Will crash: ${this.willCrash}`);

        clearTimeout(this.restCrash);
        // @ts-ignore
        this.restCrash = setTimeout(() => {
            this.willCrash = 0;
            this.restCrash = undefined;
        }, 5000);
    }
}
