import {KeyboardInput} from "./input/KeyboardInput.ts";
import {Window} from "./render/Window.ts";
import {isDev, WorldConfig} from "../configs/WorldConfig.ts";
import {mainWindow} from "../main.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import type {Supplier, UUID} from "../apis/types.ts";
import {ClientWorld} from "./ClientWorld.ts";
import {ClientPlayerEntity} from "./entity/ClientPlayerEntity.ts";
import {LoadingScreen} from "./render/ui/LoadingScreen.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {sleep} from "../utils/uit.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "./DataLoader.ts";
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
import type {StartServer} from "../apis/startup.ts";
import {PlayerInputC2SPacket} from "../network/packet/c2s/PlayerInputC2SPacket.ts";
import {documentDir, resolve, resolveResource} from "@tauri-apps/api/path";
import {exists, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs";
import {ClientSavesManager} from "./ClientSavesManager.ts";
import {confirm, message} from "@tauri-apps/plugin-dialog";
import {EVENTS} from "../apis/IEvents.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {StatisticManager} from "./render/statistic/StatisticManager.ts";
import {ClientConnection} from "./network/ClientConnection.ts";
import {WorldRender} from "./render/WorldRender.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";

export class NovaFlightClient {
    private static readonly SERVER_SHUTDOWN_TIMEOUT = 8000;
    private static readonly SERVER_START_TIMEOUT = 5000;

    private static instance: NovaFlightClient;
    public readonly clientId: UUID;
    public playerName: string;

    public readonly window: Window;
    public readonly input: KeyboardInput;

    public readonly networkChannel: ClientNetworkChannel;
    private readonly connection: ClientConnection;
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

        this.networkChannel = new ClientNetworkChannel(
            `127.0.0.1:${WorldConfig.port}`,
            this.clientId
        );
        this.connection = new ClientConnection(this.networkChannel);
        this.networkHandler = new ClientNetworkHandler(this, this.connection);

        this.multiGameManager = new ClientMultiGameManger();
        this.saveManager = new ClientSavesManager();
        this.statisticManager = new StatisticManager();

        this.clientCommandManager = new ClientCommandManager(this.networkHandler.getCommandSource());
        this.clientChat = new ClientChat(this);

        this.input = new KeyboardInput(this.window.canvas);
        this.input.onKeyDown(this.registryInput.bind(this));
        this.registryListener();

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

            // wait for user input
            const startScreen = new StartScreen(this.window.ctx, {
                title: `Nova Flight (${WorldConfig.version})`,
                subtitle: '点击按钮 开始',
            });

            const action = await startScreen.onConfirm();

            if (action === -1) break;

            if (action === 0) {
                this.isIntegrated = true;
                const saveName = await this.saveManager.choseSaves();
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

    public async joinGame(world: ClientWorld) {
        this.connectInfo?.setMessage('加入世界中...');
        await sleep(200);

        this.world = world;
        this.worldRender.setWorld(world);
        this.playing = true;
        this.loop(0);

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
            SoundSystem.globalSound.playSound(SoundEvents.UI_BUTTON_PRESSED);
            if (this.isIntegrated && this.world) this.world.worldSound.pauseAll().catch(console.error);
        } else if (!bl && this.pause) {
            this.server?.postMessage({type: 'start_ticking'});

            AudioManager.resume();
            SoundSystem.globalSound.playSound(SoundEvents.UI_PAGE_SWITCH);
            this.world?.worldSound.resumeAll().catch(console.error);
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

            while (this.accumulator >= WorldConfig.mbps) {
                this.tick();
                this.accumulator -= WorldConfig.mbps;
            }

            if (ts - this.lastRenderTime >= WorldConfig.perFrame) {
                this.worldRender.render(this.pause ? 1 : this.accumulator / WorldConfig.mbps);
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

        const dt = this.pause ? 1 : WorldConfig.mbps;
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
                warn('[Client] Waiting worker terminate timeout');
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
        this.networkChannel.setServerAddress(address);

        const connectInfo = new ConnectInfo(this.window.ctx, this.stopWorld.bind(this));
        this.connectInfo?.destroy();
        this.connectInfo = connectInfo;
        connectInfo.setMessage('尝试连接...');

        const result = await this.networkChannel.sniff(
            address,
            1000,
            3,
            (num, max) => {
                connectInfo.setMessage(`尝试连接(${num + 1}/${max})...`);
            });

        if (!result) {
            await connectInfo.setError('未能找到服务器');
            this.stopWorld();
            return;
        }

        connectInfo.setMessage('开始连接...');

        try {
            await this.networkChannel.connect();
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
        const connectInfo = new ConnectInfo(this.window.ctx, this.stopWorld.bind(this));
        this.connectInfo?.destroy();
        this.connectInfo = connectInfo;
        connectInfo.setMessage('准备启动内置服务器...');

        // 启动中继服务器
        let key: ArrayBuffer;
        try {
            await invoke('stop_server');
            const obj = await invoke('start_server', {port: WorldConfig.port});

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

        const addr = `127.0.0.1:${WorldConfig.port}`;
        this.networkChannel.setServerAddress(addr);

        // 确认中继服务器开启
        const canConnect = await this.networkChannel.sniff(addr);
        if (!canConnect) {
            await connectInfo.setError('连接已丢失: 无法启动内置服务器');
            return;
        }

        const connectToServer = async () => {
            connectInfo.setMessage('开始连接...');
            try {
                await this.networkChannel.connect();
                this.networkHandler.checkServer();
            } catch (err) {
                console.error(err);
                await error(String(err));
                await connectInfo.setError(`连接失败`);
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
            connectInfo.setError('连接超时');
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
                case 'readFile':
                    this.serverReadFile(event.data);
                    break;
                case 'writeFile':
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
        this.player = null;
    }

    public getServerWorker(): ServerWorker | null {
        return this.server;
    }

    public isRunning(): boolean {
        return this.playing;
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
        }, {signal: ctrl.signal, once: true});
    }

    // 其他

    public async initResources(): Promise<void> {
        const loadingScreen = new LoadingScreen(this.window.ctx);
        loadingScreen.setSize(Window.VIEW_W, Window.VIEW_H);
        loadingScreen.loop();

        await this.update(loadingScreen);

        loadingScreen.setProgress(0.2, '注册资源');
        const manager = this.registryManager;
        await manager.registerAll();
        await sleep(200);

        loadingScreen.setProgress(0.4, '初始化渲染器');
        EntityRenderers.registryRenders();
        await sleep(200);

        loadingScreen.setProgress(0.6, '加载资源');
        await DataLoader.init(manager);

        loadingScreen.setProgress(0.8, '冻结资源');
        manager.freeze();
        await sleep(200);

        loadingScreen.setProgress(1, '创建世界');
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

    private registryInput(event: KeyboardEvent): void {
        const world = this.world;
        if (world && world.isOver) {
            this.connection.disconnect();
            this.requestStop();
            return;
        }

        const code = event.code;
        // 开发者模式
        if (event.ctrlKey) {
            if (code === 'KeyV') this.switchDevMode();
            if (this.player?.isDevMode() && world) this.devFunc(code, world);
            return;
        }

        switch (code) {
            case 'F11':
                mainWindow.isFullscreen()
                    .then(isFull => mainWindow.setFullscreen(!isFull))
                    .catch(console.error);
                break;
            case 'KeyI':
                WorldConfig.autoShoot = !WorldConfig.autoShoot;
                break;
            case 'Escape': {
                const techTree = document.getElementById('tech-shell')!;
                if (!techTree.classList.contains('hidden')) {
                    this.toggleTechTree();
                    return;
                }
                this.togglePause();
                break;
            }
            case 'KeyG':
                this.toggleTechTree();
                this.networkChannel.send(new PlayerInputC2SPacket('KeyG'));
                break;
            case 'KeyL':
                WorldConfig.follow = !WorldConfig.follow;
                break;
            case 'F3':
                WorldConfig.renderHitBox = !WorldConfig.renderHitBox;
                break;
            case 'Tab':
                const ping = `Ping ${Math.floor(this.networkHandler.getLatency())}ms`;
                this.clientCommandManager.addPlainMessage(ping);
                break;
        }
    }

    private toggleTechTree() {
        const ticking = document.getElementById('tech-shell')!.classList.toggle('hidden');
        this.worldRender.rendering = ticking;
        this.setPause(!ticking);
    }

    public switchDevMode(bool?: boolean): void {
        const player = this.player;
        if (!player) return;

        this.networkHandler.sendCommand(`/gamemode ${bool ?? !player.isDevMode()}`);
    }

    private devFunc(code: string, world: ClientWorld): void {
        const player = this.player;
        if (!player) return;

        this.server?.postMessage({type: 'dev_mode', payload: {code}});
        switch (code) {
            case 'KeyH':
                player.setHealth(player.getMaxHealth());
                break;
            case 'KeyO':
                player.getTechs().unlockAll();
                break;
            case 'KeyF':
                world.freeze = !world.freeze;
                break;
            case 'NumpadSubtract': {
                WorldConfig.enableCameraOffset = !WorldConfig.enableCameraOffset;
                this.window.camera.cameraOffset.set(0, 0);
                break;
            }
            case 'NumpadAdd': {
                BGMManager.next();
                break;
            }
            case 'KeyP':
                localStorage.removeItem('guided');
                break;
            case 'F8':
                this.server?.postMessage({type: 'crash_the_server'});
                break;
        }
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

    private registryListener(): void {
        mainWindow.listen('tauri://focus', () => {
            WorldConfig.fps = WorldConfig.lastFps;
            WorldConfig.perFrame = 1000 / WorldConfig.fps;
        }).catch(console.error);

        mainWindow.listen('tauri://blur', () => {
            if (!this.clientCommandManager.isShow()) {
                this.setPause(true);
            }
            WorldConfig.lastFps = WorldConfig.fps;
            WorldConfig.fps = 5;
            WorldConfig.perFrame = 1000 / WorldConfig.fps;
        }).catch(console.error);

        mainWindow.listen('tauri://resize', async () => {
            this.worldRender.rendering = !await mainWindow.isMinimized();
        }).catch(console.error);

        window.addEventListener('resize', () => {
            this.window.resize();
        });

        this.window.canvas.addEventListener('click', event => {
            const world = this.world;
            if (world && this.pause) {
                this.window.pauseOverlay.handleClick(event.offsetX, event.offsetY);
            }
        });
    }
}