import {type ConnectionStateType} from "../ConnectionState.ts";
import type {PacketListener} from "./PacketListener.ts";

export class EmptyHandler implements PacketListener {
    private readonly phase: ConnectionStateType;

    public constructor(phase: ConnectionStateType) {
        this.phase = phase;
    }

    public onDisconnected(): void {
    }

    public accepts(): void {
    }

    public getPhase(): ConnectionStateType {
        return this.phase;
    }

    public clear(): void {
    }
}