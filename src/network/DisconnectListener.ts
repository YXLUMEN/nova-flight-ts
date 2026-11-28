import type {NetworkSide} from "./NetworkSide.ts";
import type {PacketListener} from "./PacketListener.ts";
import {ConnectionState} from "./ConnectionState.ts";

export class DisconnectListener implements PacketListener {
    private readonly side_: NetworkSide;

    public constructor(side: NetworkSide) {
        this.side_ = side;
    }

    public onDisconnected(): void {
    }

    public accept(): void {
    }

    public getPhase(): ConnectionState {
        return ConnectionState.DISCONNECTING;
    }

    public tick(): void {
    }

    public clear(): void {
    }

    public side(): NetworkSide {
        return this.side_;
    }
}