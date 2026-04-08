import {KeyboardInput} from "./input/KeyboardInput.ts";
import {Window} from "./render/Window.ts";
import {isDev, GlobalConfig} from "../configs/GlobalConfig.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import type {Supplier, UUID} from "../type/types.ts";
import {ClientWorld} from "./ClientWorld.ts";
import {ClientPlayerEntity} from "./entity/ClientPlayerEntity.ts";
import {LoadingScreen} from "./render/ui/LoadingScreen.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {sleep} from "../utils/uit.ts";
import {DataLoader} from "./resource/DataLoader.ts";
import {check} from "@tauri-apps/plugin-updater";
import {StartScreen} from "./render/ui/StartScreen.ts";
import {ClientNetworkHandler} from "./network/ClientNetworkHandler.ts";
import {error, info, warn} from "@tauri-apps/plugin-log";
import {ClientCommandManager} from "./command/ClientCommandManager.ts";
import {invoke} from "@tauri-apps/api/core";
import {ServerWorker} from "../worker/ServerWorker.ts";
import {ClientMultiGameManger} from "./ClientMultiGameManger.ts";
import {ConnectInfo} from "./render/ui/ConnectInfo.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";
import {ClientChat} from "./command/ClientChat.ts";
import type {StartServer} from "../type/startup.ts";
import {documentDir, resolve, resolveResource} from "@tauri-apps/api/path";
import {exists, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs";
import {ClientSavesManager} from "./ClientSavesManager.ts";
import {confirm, message} from "@tauri-apps/plugin-dialog";
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
import {RenderLoader} from "./render/RenderLoader.ts";

export class NovaFlightClient {
    private static readonly SERVER_SHUTDOWN_TIMEOUT = 8000;
    private static readonly SERVER_START_TIMEOUT = 5000;

    private static instance: NovaFlightClient;

    public readonly clientId: UUID;
    public playerName: string;

    public readonly window: Window;
    public readonly input: KeyboardInput;
    public globalSound!: SoundSystem;

    public readonly channel: ClientNetworkChannel;
    public readonly connection: ClientConnection;
    public readonly networkHandler: ClientNetworkHandler;

    private server: ServerWorker | null = null;
    private isIntegrated = false;

    public world: ClientWorld | null = null;
    public player: ClientPlayerEntity | null = null;
    public readonly worldRender: WorldRender;

    private readonly multiGameManager: ClientMultiGameManger;
    private readonly saveManager: ClientSavesManager;
    private readonly statisticManager: StatisticManager;

    public connectInfo: ConnectInfo | null = null;

    private pause = true;
    private playing = false;
    private last = 0;
    private accumulator = 0;
    private lastRenderTime = 0;

    private gameOverAbort: AbortController | null = null;
    private waitWorldStop: Promise<void> | null = null;
    private stopWorld: Supplier<void> = () => {
    };

    public readonly registryManager: RegistryManager;
    public readonly clientCommandManager: ClientCommandManager;
    public readonly clientChat: ClientChat;

    public constructor() {
        NovaFlightClient.instance = this;

        const clientId = localStorage.getItem('clientId');
        if (clientId && UUIDUtil.isValidUUID(clientId)) {
            this.clientId = clientId;
        } else {
            this.clientId = crypto.randomUUID();
            localStorage.setItem('clientId', this.clientId);
        }

        const playerName = localStorage.getItem('playerName');
        if (playerName === null) throw new Error("Player name is required");
        this.playerName = playerName;

        this.registryManager = new RegistryManager();
        this.window = new Window();
        this.worldRender = new WorldRender(this);

        this.channel = new ClientNetworkChannel(
            `127.0.0.1:${GlobalConfig.port}`,
            this.clientId
        );
        this.connection = new ClientConnection(this.channel);
        this.networkHandler = new ClientNetworkHandler(this, this.connection);

        this.multiGameManager = new ClientMultiGameManger();
        this.saveManager = new ClientSavesManager();
        this.statisticManager = new StatisticManager();

        this.clientCommandManager = new ClientCommandManager(this.networkHandler.getCommandSource());
        this.clientChat = new ClientChat(this);

        this.input = new KeyboardInput(this.window.canvas);
        ClientInputEvents.registryAll(this, this.input);

        this.createWorldStopPromise();
    }

    public static getInstance(): NovaFlightClient {
        return this.instance;
    }

    public async startClient() {
        this.window.resize();
        await this.initResources();

        if (!isDev) {
            BGMManager.init();
        } else {
            AudioManager.setDisable(true);
        }

        while (true) {
            if (this.waitWorldStop === null) this.createWorldStopPromise();
            this.connection.setPacketListener(this.networkHandler.getPhase(), this.networkHandler);
            const breakLoop = await this.userSelect();
            if (breakLoop) break;

            this.world?.events.emit(EVENTS.GAME_START, null);
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
        this.networkHandler.destroy();
    }

    private async userSelect(): Promise<boolean> {
        const startScreen = new StartScreen(this, {
            title: `Nova Flight (${GlobalConfig.devVersion})`,
            subtitle: TranslatableText.of('start.subtitle').toString(),
        });

        const action = await startScreen.onConfirm();
        if (action === -1) return true;

        if (action === 0) {
            this.isIntegrated = true;
            const saveName = await this.saveManager.chooseSave();
            this.saveManager.hide();
            if (saveName === null) {
                this.stopWorld();
            } else {
                await this.startIntegratedServer(saveName);
            }
        } else if (action === 1) {
            this.isIntegrated = false;
            await this.connectToServer();
        } else if (action === 2) {
            await this.statisticManager.selectItem();
            this.stopWorld();
        }
        return false;
    }

    public async joinGame(world: ClientWorld) {
        this.connectInfo?.setMessage(TranslatableText.of('start.join_game').toString());
        await sleep(200);

        this.world = world;
        this.worldRender.setWorld(world);
        this.playing = true;
        this.loop(0);
        this.window.canvas.style.cursor = 'none';

        this.connectInfo?.destroy();
        this.clientCommandManager.clearParseCache();
    }

    public leaveGame() {
        this.connection.disconnect();
        this.requestStop();
    }

    public setPause(bl: boolean): void {
        if (bl && !this.pause) {
            this.server?.postMessage({type: 'stop_ticking'});

            AudioManager.pause();
            this.globalSound.playSound(SoundEvents.UI_BUTTON_PRESSED);
            if (this.isIntegrated && this.world) this.world.worldSound.pauseAll().catch(console.error);
            TipManager.carousel();
            this.window.canvas.style.cursor = 'crosshair';
        } else if (!bl && this.pause) {
            this.server?.postMessage({type: 'start_ticking'});

            AudioManager.resume();
            this.globalSound.playSound(SoundEvents.UI_PAGE_SWITCH);
            this.world?.worldSound.resumeAll().catch(console.error);
            TipManager.cancel();
            this.window.canvas.style.cursor = 'none';
        }

        this.pause = bl;
    }

    public isPause(): boolean {
        return this.pause;
    }

    public togglePause(): void {
        this.setPause(!this.pause);
    }

    private loop(ts: number) {
        try {
            if (!this.playing) {
                this.stopWorld();
                return;
            }

            const tickDelta = Math.min(0.1, (ts - this.last) / 1000 || 0);
            this.last = ts;
            this.accumulator += tickDelta;

            while (this.accumulator >= GlobalConfig.mbps) {
                this.tick();
                this.accumulator -= GlobalConfig.mbps;
            }

            if (ts - this.lastRenderTime >= GlobalConfig.perFrame) {
                this.worldRender.render(this.pause ? 1 : this.accumulator / GlobalConfig.mbps);
                this.lastRenderTime = ts;
            }

            requestAnimationFrame(this.bindLoop);
        } catch (err) {
            const msg = err instanceof Error ?
                `[Client] Crash ${err.name}:${err.message} because ${err.cause} at\n${err.stack}` :
                `[Client] Crash ${err}`;

            console.error(msg);
            error(msg).then();
            this.stopWorld();
        }
    }

    private bindLoop = this.loop.bind(this);

    private tick() {
        this.connection.tick();

        const dt = this.pause ? 1 : GlobalConfig.mbps;
        this.window.hud.tick(dt);
        if (this.world && !this.pause) {
            this.worldRender.tick(dt);
            this.world.tick(dt);
            this.input.updateEndFrame();
        }
    }

    private createWorldStopPromise(): void {
        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitWorldStop = promise;
        this.stopWorld = () => {
            console.log('[Client] Stopping world');

            if (!this.waitWorldStop) return;
            this.connectInfo?.destroy();
            this.clearWorld();
            this.last = 0;
            this.accumulator = 0;

            if (!this.server) {
                resolve();
                this.waitWorldStop = null;
                return;
            }

            const terminate = () => {
                this.server?.terminate();
                this.server = null;

                resolve();
                this.waitWorldStop = null;
            };

            const shutTimeout = setTimeout(() => {
                void warn('[Client] Waiting worker terminate timeout');
                terminate();
            }, NovaFlightClient.SERVER_SHUTDOWN_TIMEOUT);

            this.server.getWorker().onmessage = event => {
                if (event.data.type !== 'server_shutdown') return;

                clearTimeout(shutTimeout);
                terminate();
            };

            this.server.postMessage({type: 'stop_server'});
        };
    }

    private async connectToServer(): Promise<void> {
        const address = await this.multiGameManager.getServerAddress();
        this.multiGameManager.hide();

        if (address === null) {
            this.stopWorld();
            return;
        }
        this.channel.setServerAddress(address);

        const connectInfo = new ConnectInfo(this, this.stopWorld.bind(this));
        this.connectInfo?.destroy();
        this.connectInfo = connectInfo;
        connectInfo.setMessage(TranslatableText.of('start.remote.connecting').toString());

        const result = await this.channel.sniff(
            address,
            1000,
            3,
            (num, max) => {
                const args = [num + 1, max].map(String);
                connectInfo.setMessage(new TranslatableText('start.remote.retry', args).toString());
            });

        if (!result) {
            await connectInfo.setError(TranslatableText.of('start.remote.fail.found_server').toString());
            this.stopWorld();
            return;
        }

        connectInfo.setMessage(TranslatableText.of('start.connecting').toString());

        try {
            await this.channel.connect();
        } catch (err) {
            await connectInfo.setError(String(err));
            return;
        }

        this.networkHandler.checkServer();

        await connectInfo.waitConfirm();
    }

    private async startIntegratedServer(saveName: string): Promise<void> {
        if (this.server) return;

        // 全屏提示
        const connectInfo = new ConnectInfo(this, this.stopWorld.bind(this));
        this.connectInfo?.destroy();
        this.connectInfo = connectInfo;
        connectInfo.setMessage(TranslatableText.of('start.integrated.start').toString());

        // 启动中继服务器
        let key: ArrayBuffer;
        try {
            await invoke('stop_server');
            const obj = await invoke('start_server', {port: GlobalConfig.port});

            if (!Array.isArray(obj)) {
                // noinspection ExceptionCaughtLocallyJS
                throw new TypeError("Key must be an number array");
            }
            key = new Uint8Array(obj).buffer;
        } catch (err) {
            console.error(err);
            await error(String(err));
            await connectInfo.setError(String(err));
            return;
        }

        await sleep(300);

        const addr = `127.0.0.1:${GlobalConfig.port}`;
        this.channel.setServerAddress(addr);

        // 确认中继服务器开启
        const canConnect = await this.channel.sniff(addr);
        if (!canConnect) {
            await connectInfo.setError(TranslatableText.of('start.integrated.fail.start').toString());
            return;
        }

        const connectToServer = async () => {
            connectInfo.setMessage(TranslatableText.of('start.connecting').toString());
            try {
                await this.channel.connect();
                this.networkHandler.checkServer();
            } catch (err) {
                console.error(err);
                await error(String(err));
                await connectInfo.setError(TranslatableText.of('start.fail.connect').toString());
                this.stopWorld();
            }
        };

        // 内置服务器配置
        const startUp: StartServer = {
            addr,
            key,
            hostUUID: this.clientId,
            saveName
        };

        // Vite 规定的格式 integrated dev
        const server = new ServerWorker(new Worker(new URL('../worker/integrated.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        }));

        this.server = server;
        const worker = this.server.getWorker();

        const startTimeout = setTimeout(() => {
            connectInfo.setError(TranslatableText.of('network.disconnect.timeout').toString());
            server.terminate();
        }, NovaFlightClient.SERVER_START_TIMEOUT);

        worker.onmessage = event => {
            switch (event.data.type) {
                case 'server_start':
                    clearTimeout(startTimeout);
                    connectToServer();
                    break;
                case 'server_stop':
                    this.stopWorld();
                    break;
                case 'saved':
                    this.clientCommandManager.addPlainMessage('\x1b[32m游戏已保存');
                    break;
                case 'read_file':
                    this.serverReadFile(event.data);
                    break;
                case 'write_file':
                    this.serverWriteFile(event.data);
                    break;
                case 'log':
                    const level = event.data.level;
                    if (level === 'info') info(event.data.message);
                    else if (level === 'warn') warn(event.data.message);
                    else if (level === 'error') error(event.data.message);
                    break;
                case 'message':
                    message(event.data.message, {kind: event.data.kind});
                    break;
            }
        };

        worker.onerror = event => {
            const err = event.error;
            const msg = err instanceof Error ?
                `[Server Thread] Crash ${err.name}:${err.message} because ${err.cause} at\n ${err.stack}` :
                `[Server Thread] Crash ${event.type}:${event.message} because ${event.error}`;

            console.error(msg);
            error(msg);
            this.requestStop();
        }

        server.postMessage({
            type: 'start_server',
            payload: startUp
        }, {transfer: [key]});

        await connectInfo.waitConfirm();
    }

    private clearWorld(): void {
        this.worldRender.setWorld(null);
        this.world?.close();
        this.world = null;
        this.window.hud.setPlayer(null);
        this.player = null;
    }

    public getServerWorker(): ServerWorker | null {
        return this.server;
    }

    public requestStop(): void {
        this.playing = false;
    }

    public onGameOver(): void {
        this.networkHandler.clear();

        document.getElementById('tech-shell')!.classList.add('hidden');

        const ctrl = new AbortController();
        this.gameOverAbort?.abort();
        this.gameOverAbort = ctrl;
        window.addEventListener('keydown', () => {
            this.leaveGame();
            ctrl.abort();
        }, {signal: ctrl.signal});
    }

    // 其他

    public async initResources(): Promise<void> {
        const loadingScreen = new LoadingScreen(this);
        loadingScreen.setSize(Window.VIEW_W, Window.VIEW_H);
        loadingScreen.loop();

        await this.update(loadingScreen);

        loadingScreen.setProgress(0.2, '注册资源');
        const manager = this.registryManager;
        await manager.registerAll();
        await sleep(200);

        loadingScreen.setProgress(0.4, '加载资源');
        await DataLoader.registerAndLoad(manager, loadingScreen);
        this.globalSound = new SoundSystem();

        loadingScreen.setProgress(0.6, '初始化渲染器');
        await RenderLoader.registerAndLoad(loadingScreen);
        await sleep(200);

        loadingScreen.setProgress(0.8, '冻结资源');
        manager.freeze();
        await sleep(200);

        loadingScreen.setProgress(1, '启动游戏');
        await sleep(200);
        await loadingScreen.setDone();
    }

    private async update(loadingScreen: LoadingScreen): Promise<void> {
        try {
            loadingScreen.setProgress(0, '检测更新');
            await sleep(200);

            const update = await check({timeout: 2000});
            if (!update) return;

            if (!await confirm(`当前游戏版本为 "${update.currentVersion}" 存在更新版本 "${update.version}"`, {
                title: '发现更新',
                okLabel: '更新',
                cancelLabel: '忽略'
            })) return;

            let contentLength: number = 0;
            let downloaded = 0;
            await update.downloadAndInstall(event => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength ?? 0;
                        loadingScreen.setProgress(0, `开始下载, 总共: ${contentLength} bytes`);
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        loadingScreen.setProgress(downloaded / contentLength, `正在下载...`);
                        break;
                    case 'Finished':
                        loadingScreen.setProgress(1, '下载完成, 程序即将重启');
                        loadingScreen.setDone();
                        break;
                }
            });
        } catch (error) {
            console.error(error);
            loadingScreen.setProgress(0, '检查更新失败');
        }
        await sleep(500);
    }

    public toggleTechTree() {
        const ticking = document.getElementById('tech-shell')!.classList.toggle('hidden');
        this.worldRender.rendering = ticking;
        this.setPause(!ticking);
    }

    public switchDevMode(bool?: boolean): void {
        const player = this.player;
        if (!player) return;

        this.networkHandler.sendCommand(`/gamemode ${bool ?? !player.isDevMode()}`);
    }

    private async serverReadFile(data: any) {
        if (!this.server) return;

        const path = data.path as string;
        const res = await resolveResource(`resources/nova-flight/${path}`);

        if (!(await exists(res))) {
            this.server.postMessage({
                type: 'readFile',
                id: data.id,
                buffer: null
            });
            return;
        }

        const buffer = await readFile(res);
        this.server.postMessage({
            type: 'readFile',
            id: data.id,
            buffer: buffer
        }, {transfer: [buffer.buffer]});
    }

    private async serverWriteFile(data: any) {
        const path = data.path as string;
        const buffer = data.buffer;
        if (!(buffer instanceof ArrayBuffer)) throw new TypeError('BufferData must be an ArrayBuffer');

        const documentPath = await documentDir();
        const saveRoot = await resolve(documentPath, 'saves');
        if (!await exists(saveRoot)) {
            await mkdir(saveRoot);
        }

        const resolved = await resolve(saveRoot, path);
        await writeFile(resolved, new Uint8Array(buffer), {create: true});
    }
}