import {TickRateManager} from "../world/TickRateManager.ts";
import type {NovaFlightServer} from "./NovaFlightServer.ts";
import {TickChangeS2CPacket} from "../network/packet/s2c/TickChangeS2CPacket.ts";

export class ServerTickManager extends TickRateManager {
    private readonly server: NovaFlightServer;

    public constructor(server: NovaFlightServer) {
        super();
        this.server = server;
    }

    public setRate(rate: number) {
        super.setRate(rate);
        this.server.networkChannel.send(new TickChangeS2CPacket(this.tickRate));
    }
}