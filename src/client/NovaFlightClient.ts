import {KeyboardInput} from "./input/KeyboardInput.ts";
import {Window} from "./render/Window.ts";
import {GlobalConfig, isDev} from "../configs/GlobalConfig.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import type {Consumer, UUID} from "../type/types.ts";
import {ClientWorld} from "./ClientWorld.ts";
import {ClientPlayerEntity} from "./entity/ClientPlayerEntity.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {empty, sleep} from "../utils/uit.ts";
import {StartScreen} from "./render/ui/StartScreen.ts";
import {error, warn} from "@tauri-apps/plugin-log";
import {ClientCommandManager} from "./command/ClientCommandManager.ts";
import {invoke} from "@tauri-apps/api/core";
import {ClientMultiGameManger} from "./ClientMultiGameManger.ts";
import {ConnectInfo} from "./render/ui/ConnectInfo.ts";
import {ClientChat} from "./command/ClientChat.ts";
import {ClientSavesManager} from "./ClientSavesManager.ts";
import {EVENTS} from "../type/IEvents.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {StatisticManager} from "./statistic/StatisticManager.ts";
import {ClientConnection} from "./network/ClientConnection.ts";
import {WorldRender} from "./render/WorldRender.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {TipManager} from "./tips/TipManager.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {ClientInputEvents} from "./input/ClientInputEvents.ts";
import type {ClientChannel} from "./network/ClientChannel.ts";
import {ClientCommandSource} from "./command/ClientCommandSource.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import {ClientPlayHandler} from "./network/handler/ClientPlayHandler.ts";
import {TickRateManager} from "../world/TickRateManager.ts";
import {ClientWorkerFS} from "./ClientWorkerFS.ts";
import {ClientConnector} from "./network/ClientConnector.ts";
import type {ConnectionContext} from "./network/ConnectionContext.ts";
import {ClientInit} from "./ClientInit.ts";

export class NovaFlightClient {
    private static readonly SERVER_SHUTDOWN_TIMEOUT = 8000;

    private static instance: NovaFlightClient;

    public readonly clientId: UUID;
    public playerName: string;

    public readonly window: Window;
    public readonly input: KeyboardInput;
    public globalSound!: SoundSystem;

    private channel: ClientChannel;
    public readonly connection: ClientConnection;
    public readonly networkHandler: ClientPlayHandler;
    public readonly commandSource: ClientCommandSource;

    private worker: Worker | null = null;
    private isIntegrated = false;
    private readonly workerFs: ClientWorkerFS = new ClientWorkerFS();

    public world: ClientWorld | null = null;
    public player: ClientPlayerEntity | null = null;
    public readonly worldRender: WorldRender;

    private readonly multiGameManager: ClientMultiGameManger;
    private readonly saveManager: ClientSavesManager;
    private readonly statisticManager: StatisticManager;

    private connectInfo: ConnectInfo | null = null;

    private readonly tickManager: TickRateManager;
    private pause = true;
    private playing = false;
    private last = 0;
    private accumulator = 0;
    private lastRenderTime = 0;

    private gameOverAbort: AbortController | null = null;
    private waitWorldStop: Promise<void> | null = null;
    private stopWorld: Consumer<void> = empty;

    public readonly registryManager: RegistryManager;
    public readonly clientCommandManager: ClientCommandManager;
    public readonly clientChat: ClientChat;

    public constructor(clientId: UUID, playerName: string) {
        NovaFlightClient.instance = this;
        this.clientId = clientId;
        this.playerName = playerName;

        this.registryManager = new RegistryManager();
        this.window = new Window();
        this.worldRender = new WorldRender(this);
        this.tickManager = new TickRateManager();

        this.channel = new ClientNetworkChannel('', this.clientId);
        this.connection = new ClientConnection(this.channel);
        this.networkHandler = new ClientPlayHandler(this, this.connection);

        this.multiGameManager = new ClientMultiGameManger();
        this.saveManager = new ClientSavesManager();
        this.statisticManager = new StatisticManager();

        this.commandSource = new ClientCommandSource(this);
        this.clientCommandManager = new ClientCommandManager(this.commandSource);
        this.clientChat = new ClientChat(this);

        this.input = new KeyboardInput(this.window.canvas);
        ClientInputEvents.registryAll(this, this.input);

        this.createWorldStopPromise();
        this.loop = this.loop.bind(this);
    }

    public static getInstance(): NovaFlightClient {
        return this.instance;
    }

    public async startClient() {
        this.window.resize();
        await new ClientInit(this).initResources();

        if (!isDev) {
            BGMManager.init();
        } else {
            AudioManager.setDisable(true);
        }

        while (true) {
            if (this.waitWorldStop === null) this.createWorldStopPromise();
            const breakLoop = await this.userSelect();
            if (breakLoop) break;

            GeneralEventBus.getEventBus().emit(EVENTS.GAME_START, null);
            await this.waitWorldStop;

            // cleanup
            this.gameOverAbort?.abort();
            this.connection.clean();
            if (this.isIntegrated) {
                await invoke('stop_server');
            }
            this.window.resize();
        }

        this.connection.clean();
    }

    private async userSelect(): Promise<boolean> {
        const startScreen = new StartScreen(this, {
            title: `Nova Flight (${GlobalConfig.devVersion})`,
            subtitle: TranslatableText.of('start.subtitle').toString(),
        });

        const action = await startScreen.onConfirm();
        if (action === -1) return true;

        const ctx = new NovaFlightClient.ConnectCtx(this);
        const connector = new ClientConnector(this, ctx);

        if (action === 0) {
            this.isIntegrated = true;
            const saveName = await this.saveManager.chooseSave();
            this.saveManager.hide();
            if (saveName === null) {
                this.stopWorld();
                return false;
            }

            if (GlobalConfig.generalMode) await connector.startGeneralServer(saveName);
            else await connector.startIntegratedServer(saveName);
            return false;
        }
        if (action === 1) {
            this.isIntegrated = false;
            await connector.connectToServer();
            return false;
        }
        if (action === 2) {
            await this.statisticManager.selectItem();
            this.stopWorld();
            return false;
        }
        return false;
    }

    public async joinGame(world: ClientWorld) {
        if (this.connectInfo) {
            this.connectInfo.setOnDestroy(empty);
            this.connectInfo.setMessage(TranslatableText.of('start.join_game'));
            this.connectInfo.setLabel(null);
        }

        await sleep(200);

        this.world = world;
        this.worldRender.setWorld(world);
        this.playing = true;
        this.loop(0);
        this.window.canvas.style.cursor = 'none';

        this.setConnectInfo(null);
        this.clientCommandManager.clearParseCache();
    }

    public isPause(): boolean {
        return this.pause;
    }

    public setPause(bl: boolean): void {
        if (bl && !this.pause) {
            this.worker?.postMessage({type: 'stop_ticking'});

            AudioManager.pause();
            this.globalSound.playSound(SoundEvents.UI_BUTTON_PRESSED);
            if (this.isIntegrated && this.world) this.world.worldSound.pauseAll().catch(console.error);
            TipManager.carousel();
            this.window.canvas.style.cursor = 'crosshair';
        } else if (!bl && this.pause) {
            this.worker?.postMessage({type: 'start_ticking'});

            AudioManager.resume();
            this.globalSound.playSound(SoundEvents.UI_PAGE_SWITCH);
            this.world?.worldSound.resumeAll().catch(console.error);
            TipManager.cancel();
            this.window.canvas.style.cursor = 'none';
        }

        this.pause = bl;
    }

    private loop(ts: number): void {
        try {
            if (!this.playing) {
                this.stopWorld();
                return;
            }

            const tickDelta = Math.min(0.1, (ts - this.last) / 1000 || 0);
            this.last = ts;
            this.accumulator += tickDelta;

            let step = 0;
            const maxStep = this.tickManager.getMaxStep();
            const preTick = this.tickManager.mspt();
            while (this.accumulator >= preTick && step < maxStep) {
                this.tick(preTick);
                this.accumulator -= preTick;
                step++
            }

            if (ts - this.lastRenderTime >= GlobalConfig.perFrame) {
                this.worldRender.render(this.pause ? 1 : this.accumulator / preTick);
                this.lastRenderTime = ts;
            }

            requestAnimationFrame(this.loop);
        } catch (err) {
            const msg = Error.isError(err) ?
                `[Client] Crash ${err.name}:${err.message} because ${err.cause} at\n${err.stack}` :
                `[Client] Crash ${err}`;

            console.error(msg);
            void error(msg);
            this.stopWorld();
        }
    }

    private tick(preTick: number): void {
        this.connection.tick();

        const dt = this.pause ? 1 : preTick;
        this.window.hud.tick(dt);
        if (this.world && !this.pause) {
            this.worldRender.tick(dt);
            this.world.tick(dt);
            this.input.updateEndFrame();
        }
    }

    private createWorldStopPromise(): void {
        this.stopWorld();

        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitWorldStop = promise;
        this.stopWorld = () => {
            console.log('[Client] Stopping world');

            if (!this.waitWorldStop) return;
            this.setConnectInfo(null);
            this.clearWorld();
            this.last = 0;
            this.accumulator = 0;

            if (!this.worker) {
                resolve();
                this.waitWorldStop = null;
                return;
            }

            const worker = this.worker;
            const terminate = () => {
                worker.terminate();
                this.worker = null;

                resolve();
                this.waitWorldStop = null;
            };

            const shutTimeout = setTimeout(() => {
                void warn('[Client] Waiting worker terminate timeout');
                terminate();
            }, NovaFlightClient.SERVER_SHUTDOWN_TIMEOUT);

            worker.onmessage = event => {
                if (event.data.type !== 'server_shutdown') return;

                clearTimeout(shutTimeout);
                terminate();
            };

            this.worker.postMessage({type: 'stop_server'});
        };
    }

    private clearWorld(): void {
        this.worldRender.setWorld(null);

        this.world?.close();
        this.world = null;

        this.window.hud.setPlayer(null);
        this.player = null;
    }

    public requestStop(): void {
        this.playing = false;
    }

    public leaveGame(): void {
        this.connection.disconnect();
        this.requestStop();
    }

    public setConnectError(message: string): void {
        this.connectInfo?.setMessage(message);
        this.connectInfo?.setLabel(TranslatableText.of('start.confirm'));
    }

    public setConnectInfo(info: ConnectInfo | null): void {
        this.connectInfo?.destroy();
        this.connectInfo = info;
    }

    public onGameOver(): void {
        this.networkHandler.clear();

        document.getElementById('tech-shell')!.classList.add('hidden');

        const ctrl = new AbortController();
        this.gameOverAbort?.abort();
        this.gameOverAbort = ctrl;
        window.addEventListener('keydown', () => {
            ctrl.abort();
            this.leaveGame();
            this.gameOverAbort = null;
        }, {signal: ctrl.signal});
    }

    // 其他

    public getServerWorker(): Worker | null {
        return this.worker;
    }

    public getTickManager() {
        return this.tickManager;
    }

    public switchDevMode(bool?: boolean): void {
        const player = this.player;
        if (!player) return;

        this.networkHandler.sendCommand(`/gamemode ${bool ?? !player.isDevMode()}`);
    }

    private static readonly ConnectCtx = class implements ConnectionContext {
        private readonly client: NovaFlightClient;

        public constructor(client: NovaFlightClient) {
            this.client = client;
            this.stop = this.stop.bind(this);
        }

        public async getServerAddr(): Promise<string | null> {
            const result = await this.client.multiGameManager.getServerAddress();
            this.client.multiGameManager.hide();
            return result;
        }

        public setChannel(channel: ClientChannel) {
            this.client.channel = channel;
            this.client.connection.changeChannel(channel);
        }

        public sniff(
            retryDelay?: number,
            maxRetries?: number,
            onTry?: (attempts: number, maxRetries: number) => boolean
        ): Promise<boolean> {
            return this.client.channel.sniff(retryDelay, maxRetries, onTry);
        }

        public connect(): Promise<void> {
            return this.client.channel.connect();
        }

        public hasWorker(): boolean {
            return this.client.worker !== null;
        }

        public setWorker(worker: Worker | null) {
            if (worker === null) this.client.worker?.terminate();
            this.client.worker = worker;
        }

        public stop() {
            this.client.stopWorld();
        }

        public workerFs(): ClientWorkerFS {
            return this.client.workerFs;
        }
    }
}