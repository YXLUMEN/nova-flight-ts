import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {UUID} from "../apis/types.ts";
import type {GameProfile} from "./entity/GameProfile.ts";
import {ServerDB} from "./ServerDB.ts";
import {TutorialStage} from "../configs/TutorialStage.ts";
import {TutorialEvents} from "./event/TutorialEvents.ts";
import {PlayAudioS2CPacket} from "../network/packet/s2c/PlayAudioS2CPacket.ts";
import {Audios} from "../sound/Audios.ts";

export class IntegratedServer extends NovaFlightServer {
    private readonly hostUUID: UUID;

    public constructor(secretKey: Uint8Array, host: UUID, saveName: string) {
        super(secretKey, saveName);
        this.hostUUID = host;
    }

    public static startServer(secretKey: Uint8Array, hostUUID: UUID, saveName: string) {
        if (!NovaFlightServer.instance) {
            NovaFlightServer.instance = new IntegratedServer(secretKey, hostUUID, saveName);
        }

        return NovaFlightServer.instance;
    }

    public override async runServer(action: number): Promise<void> {
        const manager = new RegistryManager();
        await manager.registerAll();
        manager.freeze();

        await this.startGame(manager, action === 1);

        const isTutorial = await ServerDB.db.get<string>('user_info', 'tutorial');
        if (isTutorial === null && action === 0 && this.world) {
            await ServerDB.db.update('user_info', {name: 'tutorial'});

            this.world.stage = TutorialStage;
            this.world.stage.reset();
            TutorialEvents.register();
            this.world.getNetworkChannel().send(new PlayAudioS2CPacket(Audios.PIXEL_ODYSSEY, 0.8));
        }

        await this.waitForStop();
    }

    public override onWorldStop(): Promise<void> {
        self.postMessage({type: 'server_stop'});
        return Promise.resolve();
    }

    public override loadSaves(): Promise<NbtCompound | null> {
        return ServerDB.loadWorld();
    }

    public override async saveGame(compound: NbtCompound): Promise<void> {
        const saveName = this.profile!.name;
        return ServerDB.saveWorld(saveName, compound);
    }

    public override isHost(profile: GameProfile): boolean {
        return profile.clientId === this.hostUUID;
    }
}