import {type ConnectionState} from "../../server/network/ConnectionState.ts";
import type {PacketListener} from "./PacketListener.ts";

export class EmptyHandler implements PacketListener {
    private readonly phase: ConnectionState;

    public constructor(phase: ConnectionState) {
        this.phase = phase;
    }

    public onDisconnected(): void {
    }

    public accept(): void {
    }

    public getPhase(): ConnectionState {
        return this.phase;
    }

    public clear(): void {
    }
}