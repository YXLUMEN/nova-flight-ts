import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import type {UUID} from "../apis/types.ts";
import type {GameProfile} from "./entity/GameProfile.ts";
import {ServerStorage} from "./ServerStorage.ts";
import {TutorialStage} from "../configs/TutorialStage.ts";
import {TutorialEvents} from "./event/TutorialEvents.ts";
import {PlayAudioS2CPacket} from "../network/packet/s2c/PlayAudioS2CPacket.ts";
import {Audios} from "../sound/Audios.ts";
import type {Result} from "../utils/result/Result.ts";
import {ServerNetworkChannel} from "./network/ServerNetworkChannel.ts";
import {PlayerManager} from "./entity/PlayerManager.ts";
import {Log} from "../worker/log.ts";
import {NoResultsError, StatusError} from "../apis/errors.ts";

export class IntegratedServer extends NovaFlightServer {
    private readonly hostUUID: UUID;

    public constructor(secretKey: Uint8Array, host: UUID, saveName: string) {
        const channel = new ServerNetworkChannel('127.0.0.1:25566', secretKey);
        super(saveName, channel, PlayerManager);

        this.hostUUID = host;
    }

    public static startServer(secretKey: Uint8Array, hostUUID: UUID, saveName: string) {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new IntegratedServer(secretKey, hostUUID, saveName);
        }

        return NovaFlightServer.instance;
    }

    public override async runServer(): Promise<void> {
        const manager = new RegistryManager();
        await manager.registerAll();
        manager.freeze();

        await this.startGame(manager);

        const isTutorial = await ServerStorage.db.get<string>('user_info', 'tutorial');
        if (isTutorial.ok().isEmpty() && this.world) {
            await ServerStorage.db.update('user_info', {name: 'tutorial'});

            this.world.stage = TutorialStage;
            this.world.stage.reset();
            TutorialEvents.register();
            this.world.getNetworkChannel().send(new PlayAudioS2CPacket(Audios.WE_MADE_IT, 0.8));
        }

        await this.waitForStop();
    }

    public override onHalted(): Promise<void> {
        console.log('[Server] Notify client the integrated server shutdown.');
        self.postMessage({type: 'server_stop'});
        return Promise.resolve();
    }

    public override async readSave(): Promise<NbtCompound | null> {
        const result = await ServerStorage.loadWorld(this.worldName);
        if (result.isOk()) return result.unwrap();

        const err = result.unwrapErr();
        if (err instanceof NoResultsError) {
        } else if (err instanceof StatusError) {
            if (err.cause === 'broken') {
                Log.message('存档已损坏', 'warning');
            } else if (err.cause === 'pending') {
                console.log('初始化存档');
            } else {
                Log.warn(err.message);
            }
        } else {
            Log.error(err.message);
        }

        return null;
    }

    public override async saveWorld(compound: NbtCompound): Promise<void> {
        const result = await ServerStorage.updateWorld(this.profile!.name, compound);
        if (result.isErr()) {
            Log.error(result.unwrapErr().message);
        }
    }

    public override deleteWorld(worldName: string): Promise<Result<void, Error>> {
        return ServerStorage.deleteWorld(worldName);
    }

    public override isHost(profile: GameProfile): boolean {
        return profile.clientId === this.hostUUID;
    }

    public override isHostUUID(uuid: UUID): boolean {
        return uuid === this.hostUUID;
    }
}