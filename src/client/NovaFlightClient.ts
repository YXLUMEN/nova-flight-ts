import type {Consumer, UUID} from "../type/types.ts";
import type {ClientStartup} from "./ClientStartup.ts";
import type {ConnectionContext} from "./network/ConnectionContext.ts";
import type {ClientChannel} from "./network/ClientChannel.ts";
import type {LocalPlayerEntity} from "./entity/LocalPlayerEntity.ts";
import {error, warn} from "@tauri-apps/plugin-log";
import {invoke} from "@tauri-apps/api/core";
import {empty, sleep, timeout} from "../utils/uit.ts";
import {KeyboardInput} from "./input/KeyboardInput.ts";
import {ClientWindow} from "./render/ClientWindow.ts";
import {DEFAULT_CONFIG, isDev, RuntimeConfig} from "../configs/RuntimeConfig.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import {ClientWorld} from "./ClientWorld.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {ClientCommandManager} from "./command/ClientCommandManager.ts";
import {ClientMultiGameManger} from "./ClientMultiGameManger.ts";
import {ClientChat} from "./command/ClientChat.ts";
import {ClientSavesManager} from "./storage/ClientSavesManager.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {StatisticManager} from "./statistic/StatisticManager.ts";
import {ClientConnection} from "./network/ClientConnection.ts";
import {WorldRenderer} from "./render/WorldRenderer.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {ClientInputEvents} from "./input/ClientInputEvents.ts";
import {ClientCommandSource} from "./command/ClientCommandSource.ts";
import {appEvent} from "../event/EventBus.ts";
import {ClientPlayHandler} from "./network/handler/ClientPlayHandler.ts";
import {TickRateManager} from "../world/TickRateManager.ts";
import {ClientWorkerFS} from "./ClientWorkerFS.ts";
import {ClientConnector} from "./network/ClientConnector.ts";
import {GameStart} from "../event/events/game/GameStart.ts";
import {ClientDefaultEvents} from "./ClientDefaultEvents.ts";
import {GamePause} from "../event/events/game/GamePause.ts";
import {Main2WorkerType, Worker2MainType} from "../worker/WorkerMsgType.ts";
import {RacePromise} from "../utils/RacePromise.ts";
import {GuiLayer} from "./render/ui/GuiLayer.ts";
import {StartScreen} from "./page/compound/StartScreen.ts";

export class NovaFlightClient {
    private static readonly SERVER_SHUTDOWN_TIMEOUT = 8000;

    private static INSTANCE: NovaFlightClient;

    public readonly clientId: UUID;
    public readonly version: number;
    public readonly protocolVersion: number;
    public playerName: string;

    public readonly window: ClientWindow;
    public readonly layer: GuiLayer;
    public readonly input: KeyboardInput;
    public readonly globalSound: SoundSystem = new SoundSystem();

    protected channel: ClientChannel;
    public readonly connection: ClientConnection;
    public readonly networkHandler: ClientPlayHandler;
    public readonly commandSource: ClientCommandSource;

    private worker: Worker | null = null;
    private isIntegrated = false;
    private readonly workerFs: ClientWorkerFS = new ClientWorkerFS();

    public world: ClientWorld | null = null;
    public player: LocalPlayerEntity | null = null;
    public readonly worldRender: WorldRenderer;

    private readonly multiGameManager: ClientMultiGameManger;
    private readonly saveManager: ClientSavesManager;
    private readonly statisticManager: StatisticManager;

    private readonly tickManager: TickRateManager;
    private pause = true;
    private playing = false;
    private last = 0;
    private accumulator = 0;
    private lastRenderTime = 0;
    private renderDisable: Consumer<void> = empty;

    private waitWorldStop: Promise<void> | null = null;
    private stopWorld: Consumer<void> = empty;

    public readonly registryManager: RegistryManager;
    public readonly clientCommandManager: ClientCommandManager;
    public readonly clientChat: ClientChat;

    public constructor(startup: ClientStartup) {
        NovaFlightClient.INSTANCE = this;
        this.clientId = startup.clientId;
        this.version = DEFAULT_CONFIG.gameVersion;
        this.protocolVersion = startup.protocolVersion;
        this.playerName = startup.playerName;

        this.registryManager = startup.manager;
        this.window = startup.window;
        this.layer = new GuiLayer(this, 'gui');
        this.worldRender = new WorldRenderer(this);
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

    public static instance(): NovaFlightClient {
        return this.INSTANCE;
    }

    public async startClient() {
        ClientDefaultEvents.registryEvents();

        if (isDev) AudioManager.setDisable(true);
        BGMManager.init();

        while (true) {
            if (this.waitWorldStop === null) this.createWorldStopPromise();
            const breakLoop = await this.userSelect();
            if (breakLoop) break;

            await this.waitWorldStop;

            // cleanup
            this.connection.clean();
            if (this.isIntegrated) {
                await invoke('stop_server');
                await invoke('stop_lan_announce');
            }
            this.window.resize();
        }

        this.connection.clean();
    }

    private async userSelect(): Promise<boolean> {
        const startScreen = new StartScreen(this, RuntimeConfig.devVersion);
        this.layer.gui.open(startScreen);

        const action = await startScreen.wait();
        if (action === 'exit') return true;

        const ctx = new NovaFlightClient.ConnectCtx(this);
        const connector = new ClientConnector(this, ctx);

        if (action === 'start') {
            this.isIntegrated = true;
            this.layer.gui.open(this.saveManager);
            const saveName = await this.saveManager.chooseSave();
            if (saveName === null) {
                this.stopWorld();
                return false;
            }

            if (RuntimeConfig.generalMode) await connector.startGeneralServer(saveName);
            else await connector.startIntegratedServer(saveName);
            return false;
        }
        if (action === 'multiplayer') {
            this.isIntegrated = false;
            await connector.connectToServer();
            return false;
        }
        if (action === 'statistic') {
            this.layer.gui.open(this.statisticManager);
            await this.statisticManager.selectItem();
            this.stopWorld();
            return false;
        }
        return false;
    }

    public async joinGame(world: ClientWorld) {
        if (this.layer.hasNotice()) {
            this.layer.showNotice(TranslatableText.of('start.join_game'), null, empty);
        }

        appEvent.emit(new GameStart());
        await sleep(200);

        this.world = world;
        this.worldRender.setWorld(world);
        this.playing = true;
        this.loop(0);
        this.window.canvas.style.cursor = 'none';

        this.layer.closeNotice();
        this.clientCommandManager.clearParseCache();
    }

    public isPause(): boolean {
        return this.pause;
    }

    public setPause(bl: boolean): void {
        if (bl && !this.pause) {
            this.pause = true;
            this.worker?.postMessage({m2w: Main2WorkerType.STOP_TICKING});
            appEvent.emit(new GamePause(true));

            if (!this.player?.isOpenInventory()) {
                this.renderDisable = this.worldRender.disable();
            }

            this.globalSound.playSound(SoundEvents.UI_BUTTON_PRESSED);
            if (this.isIntegrated && this.world) {
                this.world.worldSound.pauseAll().catch(console.error);
            }
            this.window.canvas.style.cursor = 'crosshair';
        } else if (!bl && this.pause) {
            this.pause = false;
            this.worker?.postMessage({m2w: Main2WorkerType.START_TICKING});
            appEvent.emit(new GamePause(false));

            this.renderDisable();
            this.renderDisable = empty;

            this.globalSound.playSound(SoundEvents.UI_PAGE_SWITCH);
            this.world?.worldSound.resumeAll().catch(console.error);
            this.window.canvas.style.cursor = 'none';
        }
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
            const perTick = this.tickManager.spt();
            while (this.accumulator >= perTick && step < maxStep) {
                this.tick(perTick);
                this.accumulator -= perTick;
                step++
            }

            if (step >= maxStep && this.accumulator >= perTick) {
                const dropped = this.accumulator - (this.accumulator % perTick);
                void warn(`[Client] Dropped ${dropped.toFixed(1)}ms`);
                this.accumulator %= perTick;
            }

            if (ts - this.lastRenderTime >= RuntimeConfig.perFrame) {
                this.worldRender.render(this.pause ? 1 : this.accumulator / perTick);
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
        this.stopWorld = () => this.bindStopWorld(resolve);
    }

    private bindStopWorld(resolve: Consumer<void>) {
        if (!this.waitWorldStop) return;
        console.log('[Client] Stopping world');

        // clear world
        this.layer.destroyScreen();
        this.worldRender.setWorld(null);
        this.window.hud.setPlayer(null);
        this.world?.close();
        this.world = null;
        this.player = null;

        // reset loop
        this.last = 0;
        this.accumulator = 0;

        // terminate worker
        const worker = this.worker;
        if (!worker) {
            resolve();
            this.waitWorldStop = null;
            return;
        }

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
            if (event.data.w2m !== Worker2MainType.SERVER_SHUTDOWN) return;
            clearTimeout(shutTimeout);
            terminate();
        };

        worker.postMessage({m2w: Main2WorkerType.STOP_SERVER});
    }

    public requestStop(): void {
        this.playing = false;
    }

    public async saveAll(): Promise<void> {
        if (!this.worker) return;
        const {promise, resolve} = Promise.withResolvers<void>();
        const ctrl = new AbortController();
        const race = new RacePromise();

        this.worker.postMessage({m2w: Main2WorkerType.SAVE_ALL});
        this.worker.addEventListener('message', event => {
            if (event.data.w2m === Worker2MainType.SAVED) {
                resolve();
                ctrl.abort();
            }
        }, {signal: ctrl.signal});

        await race.wait(promise, timeout(NovaFlightClient.SERVER_SHUTDOWN_TIMEOUT, race.signal()));
        resolve();
        ctrl.abort();
    }

    public leaveGame(): void {
        this.layer.showNotice(TranslatableText.of('start.leave'));
        this.connection.disconnect();
        this.requestStop();
    }

    public setConnectError(message: string | TranslatableText): void {
        this.layer.showNotice(message, TranslatableText.of('start.confirm'), () => this.requestStop());
    }

    public onGameOver(): void {
        this.networkHandler.clear();
        document.getElementById('tech-shell')!.classList.add('hidden');
    }

    // 其他

    public getServerWorker(): Worker | null {
        return this.worker;
    }

    public getTickManager() {
        return this.tickManager;
    }

    private static readonly ConnectCtx = class implements ConnectionContext {
        private readonly client: NovaFlightClient;

        public constructor(client: NovaFlightClient) {
            this.client = client;
            this.stop = this.stop.bind(this);
        }

        public getServerAddr(): Promise<string | null> {
            this.client.layer.gui.open(this.client.multiGameManager);
            return this.client.multiGameManager.getServerAddress();
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