import type {UUID} from "../type/types.ts";
import type {GameProfile} from "./entity/GameProfile.ts";
import type {StartServer} from "../type/startup.ts";
import type {ServerBus} from "./network/bus/ServerBus.ts";
import {requireNotNull} from "../utils/util.ts";
import {TUTORIAL_PHASES} from "../configs/TutorialStage.ts";
import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import {ServerStorage} from "./storage/ServerStorage.ts";
import {TutorialEvents} from "./event/TutorialEvents.ts";
import {PlayAudioS2CPacket} from "../network/packet/s2c/PlayAudioS2CPacket.ts";
import {Audios} from "../sound/Audios.ts";
import {Log} from "../worker/log.ts";
import {NoResultsError, StatusError} from "../type/errors.ts";
import {ServerIntegratedBus} from "./network/bus/ServerIntegratedBus.ts";
import {ServerTechManager} from "./tech/ServerTechManager.ts";
import {ServerDefaultEvents} from "./event/ServerDefaultEvents.ts";
import {Worker2MainType} from "../worker/WorkerMsgType.ts";
import {ServerRecordManager} from "./data/ServerRecordManager.ts";
import {ServerRecordRegister} from "./data/ServerRecordRegister.ts";
import {ServerProperties} from "./ServerProperties.ts";
import {ServerNetworkBus} from "./network/bus/ServerNetworkBus.ts";
import {ServerEncryptNetBus} from "./network/bus/ServerEncryptNetBus.ts";
import {SocketAddr} from "../network/SocketAddr.ts";

export class IntegratedServer extends NovaFlightServer {
    private readonly hostUUID: UUID;

    private constructor(startUp: StartServer, bus: ServerBus) {
        super(startUp.saveName, bus);
        this.hostUUID = startUp.hostUUID;
    }

    public static async startServer(startUp: StartServer) {
        if (!NovaFlightServer.instance) {
            await ServerProperties.OPTIONS.load();
            await ServerProperties.OPTIONS.save();
            const bus = await this.chooseChannel(startUp);
            NovaFlightServer.instance = new IntegratedServer(startUp, bus);
        }

        return NovaFlightServer.instance;
    }

    private static async chooseChannel(startUp: StartServer): Promise<ServerBus> {
        if (startUp.key.byteLength === 0) return new ServerIntegratedBus();

        const secretKey = new Uint8Array(startUp.key);
        const addr = requireNotNull(SocketAddr.from(startUp.addr));
        const encrypt = ServerProperties.ENCRYPT_CHANNEL.get();
        if (!encrypt) return new ServerNetworkBus(addr, secretKey);

        const bus = new ServerEncryptNetBus(addr, secretKey);
        await bus.init();
        return bus;
    }

    public override async runServer(): Promise<void> {
        await (await import('@bokuweb/zstd-wasm')).init();

        const manager = await this.finishRegister();
        ServerTechManager.init();
        ServerDefaultEvents.registerEvent();

        await this.startGame(manager);
        await this.loadTutorial();
        await this.waitForStop();
    }

    public override onHalted(): Promise<void> {
        console.log('[Server] Notify client the integrated server stopping.');
        self.postMessage({w2m: Worker2MainType.SERVER_STOP});
        return Promise.resolve();
    }

    public override async readSave(): Promise<NbtCompound | null> {
        const result = await ServerStorage.loadWorld(this.worldName);
        if (result.isOk()) return result.unwrap();

        const err = result.unwrapErr();
        if (err instanceof NoResultsError) {
        } else if (err instanceof StatusError) {
            if (err.cause === 'broken') {
                Log.message('Archive broken', {kind: 'warning'});
            } else if (err.cause === 'pending') {
                console.log('Init archive');
            } else {
                Log.warn(err.message);
            }
        } else {
            Log.error(err.message);
        }

        return null;
    }

    public override async saveWorld(compound: NbtCompound): Promise<void> {
        if (!this.profile) {
            Log.error('[Server] Save world without server profile.');
            return;
        }

        const result = await ServerStorage.updateWorld(this.profile.name, compound);
        if (result.isErr()) {
            Log.error(result.unwrapErr().message);
        }
    }

    public override isHost(profile: GameProfile): boolean {
        return profile.clientId === this.hostUUID;
    }

    public override isHostUUID(uuid: UUID): boolean {
        return uuid === this.hostUUID;
    }

    public getHostUUID(): UUID {
        return this.hostUUID;
    }

    private async finishRegister(): Promise<RegistryManager> {
        const record = new ServerRecordManager();
        const manager = new RegistryManager();
        ServerRecordRegister.register(record);
        await manager.registerAll(record);
        manager.freeze();
        record.dispose();
        return manager;
    }

    private async loadTutorial(): Promise<void> {
        const isTutorial = await ServerStorage.db.get<string>('user_info', 'tutorial');
        if (!this.world || isTutorial.isErr() || isTutorial.unwrap() !== null) return;

        await ServerStorage.db.update('user_info', {name: 'tutorial'});

        this.world.setStage(TUTORIAL_PHASES);
        new TutorialEvents(this);
        this.world.sendPacket(new PlayAudioS2CPacket(Audios.WE_MADE_IT));
    }
}