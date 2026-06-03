import type {NovaFlightServer} from "../../server/NovaFlightServer.ts";
import type {ServerPlayerEntity} from "../../server/entity/ServerPlayerEntity.ts";
import type {CancelToken} from "./CancelToken.ts";
import type {Consumer} from "../../type/types.ts";

export class SequenceContext {
    public readonly server: NovaFlightServer;
    public readonly cancelToken: CancelToken;
    private readonly disposers: Consumer<void>[] = [];
    public readonly state: Map<string, any> = new Map();

    private hostPlayer: ServerPlayerEntity | null = null;

    public constructor(server: NovaFlightServer, cancelToken: CancelToken) {
        this.server = server;
        this.cancelToken = cancelToken;
    }

    public wait(ms: number): Promise<boolean> {
        return this.cancelToken.delay(ms);
    }

    public say(key: string, args?: string[]): void {
        this.server.sendTranslatable(key, args);
    }

    public onDispose(fn: Consumer<void>): void {
        this.disposers.push(fn);
    }

    public getHostPlayer(): ServerPlayerEntity | null {
        if (this.hostPlayer === null) {
            this.hostPlayer = this.resolveHostPlayer();
        }
        return this.hostPlayer;
    }

    private resolveHostPlayer(): ServerPlayerEntity | null {
        return this.server.playerManager.getAllPlayers()
            .find(player => this.server.isHost(player.getProfile())) ?? null;
    }

    public clear() {
        this.cancelToken.cancel();
        for (const fn of this.disposers) {
            fn();
        }
        this.disposers.length = 0;
        this.state.clear();
        this.hostPlayer = null;
    }
}