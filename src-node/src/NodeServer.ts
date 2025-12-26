import type {NbtCompound} from "../../src/nbt/NbtCompound.ts";
import {NovaFlightServer} from "../../src/server/NovaFlightServer.ts";
import type {Result} from "../../src/utils/result/Result.ts";
import {NodeServerChannel} from "./network/NodeServerChannel.ts";
import {RegistryManager} from "../../src/registry/RegistryManager.ts";
import {WorldLoader} from "./io/WorldLoader.ts";
import {NodePlayManager} from "./entity/NodePlayManager.ts";

export class NodeServer extends NovaFlightServer {
    public constructor(saveName: string) {
        const channel = new NodeServerChannel(25566);
        super(saveName, channel, NodePlayManager);
    }

    public static startServer(saveName: string) {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new NodeServer(saveName);
        }

        return NovaFlightServer.instance;
    }

    public override async runServer(): Promise<void> {
        const manager = new RegistryManager();
        await manager.registerAll();
        manager.freeze();
        await this.startGame(manager, true);
        await this.waitForStop();
    }

    public onWorldStop(): Promise<void> {
        this.networkChannel.disconnect();
        return Promise.resolve();
    }

    public saveWorld(compound: NbtCompound): Promise<void> {
        return WorldLoader.saveWorld(this.worldName, compound);
    }

    public deleteWorld(worldName: string): Promise<Result<boolean, Error>> {
        return WorldLoader.deleteWorld(worldName);
    }

    public readSave(): Promise<NbtCompound | null> {
        throw new Error("Method not implemented.");
    }

    public isHost(): boolean {
        return false;
    }
}