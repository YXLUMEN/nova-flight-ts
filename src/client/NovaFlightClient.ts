import {KeyboardInput} from "./input/KeyboardInput.ts";
import {Window} from "./render/Window.ts";
import {isDev, WorldConfig} from "../configs/WorldConfig.ts";
import {mainWindow} from "../main.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import type {UUID} from "../apis/types.ts";
import {ClientWorld} from "./ClientWorld.ts";
import {ClientPlayerEntity} from "./entity/ClientPlayerEntity.ts";
import {LoadingScreen} from "./render/ui/LoadingScreen.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {sleep} from "../utils/uit.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "../DataLoader.ts";
import {check} from "@tauri-apps/plugin-updater";
import {StartScreen} from "./render/ui/StartScreen.ts";
import {ClientPlayNetworkHandler} from "./network/ClientPlayNetworkHandler.ts";
import {RequestPositionC2SPacket} from "../network/packet/c2s/RequestPositionC2SPacket.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import {BaseDirectory, exists, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs";
import {NovaFlightServer} from "../server/NovaFlightServer.ts";
import {error} from "@tauri-apps/plugin-log";
import {ClientCommandManager} from "./ClientCommandManager.ts";
import {invoke} from "@tauri-apps/api/core";
import {ServerWorker} from "../worker/ServerWorker.ts";
import {ClientMultiGameManger} from "./ClientMultiGameManger.ts";
import {ConnectInfo} from "./render/ui/ConnectInfo.ts";
import {ClientReceive} from "./network/ClientReceive.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";

export class NovaFlightClient {
    private static instance: NovaFlightClient;

    public readonly window: Window;
    public readonly input: KeyboardInput;
    public readonly networkChannel: ClientNetworkChannel;
    public readonly networkHandler: ClientPlayNetworkHandler;

    public readonly clientId: UUID;
    public readonly registryManager: RegistryManager;
    public readonly clientCommandManager: ClientCommandManager;
    public readonly playerName: string;

    public world: ClientWorld | null = null;
    public player: ClientPlayerEntity | null = null;
    private server: ServerWorker | null = null;
    private isIntegrated = false;

    private multiGameManager: ClientMultiGameManger;
    public connectInfo: ConnectInfo | null = null;

    private running = false;
    private last = 0;
    private accumulator = 0;

    private waitWorldStop: Promise<void> | null = null;
    private stopWorld!: () => void;
    private bindRender = this.render.bind(this);

    public constructor() {
        NovaFlightClient.instance = this;

        const clientId = localStorage.getItem('clientId');
        if (clientId && UUIDUtil.isValidUUID(clientId)) {
            this.clientId = clientId;
        } else {
            this.clientId = crypto.randomUUID();
            localStorage.setItem('clientId', this.clientId);
        }
        // this.clientId = crypto.randomUUID();

        const playerName = localStorage.getItem('playerName');
        if (playerName === null) throw new Error("NovaFlightClient.playerName is required");
        this.playerName = playerName;

        this.registryManager = new RegistryManager();

        this.window = new Window();
        this.input = new KeyboardInput(this.window.canvas);

        this.networkChannel = new ClientNetworkChannel(
            `127.0.0.1:${WorldConfig.port}`,
            this.clientId
        );
        ClientReceive.registryNetworkHandler(this.networkChannel);

        this.input.onKeyDown('world_input', this.registryInput.bind(this));
        this.registryListener();

        this.networkHandler = new ClientPlayNetworkHandler(this);
        this.multiGameManager = new ClientMultiGameManger();

        this.clientCommandManager = new ClientCommandManager(this.networkHandler.getCommandSource());

        this.createPromise();
    }

    public async startClient() {
        this.window.resize();
        await this.initResources();

        if (!isDev) {
            BGMManager.init();
            await mainWindow.setFullscreen(true);
        }

        while (true) {
            if (this.waitWorldStop === null) this.createPromise();
            this.networkHandler.registryHandler();

            const startScreen = new StartScreen(this.window.ctx, {
                title: `Nova Flight (${WorldConfig.version})`,
                subtitle: '点击按钮 开始',
            });
            startScreen.setSize(Window.VIEW_W, Window.VIEW_H);
            startScreen.start();

            const action = await startScreen.onConfirm();
            if (action === -1) break;
            if (action < 2) {
                this.isIntegrated = true;
                await this.startIntegratedServer(action);
            }
            if (action === 2) {
                this.isIntegrated = false;
                await this.connectToServer();
            }

            await this.waitWorldStop;

            this.networkChannel.disconnect();
            this.networkHandler.clear();
            if (this.isIntegrated) {
                await invoke('stop_server');
            }
        }

        this.networkChannel.disconnect();
        this.networkHandler.clear();
    }

    public async joinGame(world: ClientWorld) {
        this.connectInfo?.setMessage('加入世界中...');
        await sleep(200);

        this.world = world;
        this.running = true;
        this.render(0);

        this.connectInfo?.destroy();
    }

    private render(ts: number) {
        try {
            const world = this.world;
            if (!world) return;
            if (!this.running) {
                this.stopWorld();
                return;
            }

            const tickDelta = Math.min(0.25, (ts - this.last) / 1000 || 0);
            this.last = ts;
            this.accumulator += tickDelta;

            while (this.accumulator >= WorldConfig.mbps) {
                this.tickWorld(WorldConfig.mbps);
                this.accumulator -= WorldConfig.mbps;
            }

            const alpha = world.isTicking ? this.accumulator / WorldConfig.mbps : 1;
            world.render(alpha);
            requestAnimationFrame(this.bindRender);
        } catch (err) {
            console.error(`Client runtime error: ${err}`);
            error(String(err)).catch(err => console.error(err));
            this.stopWorld();
        }
    }

    private tickWorld(dt: number) {
        if (this.world && (this.world.isTicking || this.world.isMultiPlayerWorld())) {
            this.world.tick(dt);
        }

        this.window.hud.tick(dt);
        this.input.updateEndFrame();
    }

    private createPromise(): void {
        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitWorldStop = promise;
        this.stopWorld = () => {
            if (!this.waitWorldStop) return;

            resolve();
            this.connectInfo?.destroy();
            this.clearWorld();
            this.last = 0;
            this.accumulator = 0;
            this.server?.postMessage({type: 'stop_server'});
            this.waitWorldStop = null;
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

        const connectInfo = new ConnectInfo(this.window.ctx, () => this.stopWorld());
        this.connectInfo = connectInfo;
        connectInfo.setMessage('尝试连接...');

        const result = await this.networkChannel.sniff(
            address,
            2000,
            5,
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

    private async startIntegratedServer(action: number): Promise<void> {
        if (this.server) return;

        // 全屏提示
        const connectInfo = new ConnectInfo(this.window.ctx);
        this.connectInfo = connectInfo;
        this.connectInfo.setMessage('启动内置服务器...');

        // 启动中继服务器
        let key: number[];
        try {
            await invoke('stop_server');
            const obj = await invoke('start_server', {port: WorldConfig.port});

            if (!Array.isArray(obj)) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("Key must be an number array");
            }
            key = obj;
        } catch (err) {
            console.error(err);
            await connectInfo.setError(String(err));
            return;
        }

        await sleep(300);

        const addr = `127.0.0.1:${WorldConfig.port}`;
        this.networkChannel.setServerAddress(addr);

        // 尝试连接
        const canConnect = await this.networkChannel.sniff(addr);
        if (!canConnect) {
            await this.connectInfo.setError('连接已丢失: 无法启动内置服务器');
            return;
        }

        try {
            await this.networkChannel.connect();
        } catch (err) {
            await connectInfo.setError(String(err));
            return;
        }

        // Vite 规定的格式 integrated dev
        this.server = new ServerWorker(new Worker(new URL('../worker/dev.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        }));

        this.connectInfo.setMessage('开始连接...');

        this.server.postMessage({type: 'start_server', payload: {action, addr, key, clientId: this.clientId}});

        const timeout = setTimeout(() => {
            this.connectInfo?.setError('连接超时');
            this.server?.terminate();
        }, 8000);

        this.server.getWorker().onmessage = async (event) => {
            const {type, payload} = event.data;

            if (type === 'server_start') {
                clearTimeout(timeout);
                return;
            }
            if (type === 'write_file') {
                return this.saveGame(payload);
            }
            if (type === 'read_file') {
                const nbt = await this.loadSave();
                if (!nbt) return;
                this.server!.postMessage({type: 'loaded_save_data', data: nbt.toRootBinary()});
                return;
            }
            if (type === 'server_stop') {
                this.stopWorld();
                return;
            }
            if (type === 'server_shutdown') {
                if (!this.server) return;
                this.server.terminate();
                this.server = null;
                return;
            }
        };

        this.server.getWorker().onerror = async (err) => {
            console.error('Server Thread:', err);

            let stack = '';
            if (err.error instanceof Error) {
                stack = err.error.stack ?? '';
            }
            await error(`${err.type}: ${err.message} at ${stack}`);
            this.stopWorld();
            this.server?.terminate();
        }

        await connectInfo.waitConfirm();
    }

    private clearWorld(): void {
        const world = this.world;
        if (!world) return;

        world.close();
        this.world = null;
        this.player = null;
    }

    private async saveGame(buffer: Uint8Array): Promise<void> {
        try {
            await mkdir('saves', {baseDir: BaseDirectory.Resource, recursive: true});
            await writeFile(NovaFlightServer.SAVE_PATH, buffer, {baseDir: BaseDirectory.Resource});
        } catch (err) {
            console.error(err);
        }
    }

    private async loadSave(): Promise<NbtCompound | null> {
        try {
            const available = await exists(NovaFlightServer.SAVE_PATH, {baseDir: BaseDirectory.Resource});
            if (!available) return null;

            const bytes = await readFile(NovaFlightServer.SAVE_PATH, {baseDir: BaseDirectory.Resource});
            if (!bytes || bytes.length === 0) return null;
            return NbtCompound.fromRootBinary(bytes);
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    public getServerWorker(): ServerWorker | null {
        return this.server;
    }

    public isRunning(): boolean {
        return this.running;
    }

    public scheduleStop(): void {
        this.running = false;
    }

    public static getInstance(): NovaFlightClient {
        return this.instance;
    }

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

        loadingScreen.setProgress(0.6, '加载数据');
        await DataLoader.init(manager);

        loadingScreen.setProgress(0.8, '冻结资源');
        manager.frozen();
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
            if (!update || !confirm('是否更新')) return;

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
                        loadingScreen.setProgress(1, '下载完成, 程序将关闭');
                        loadingScreen.setDone();
                        break;
                }
            });
        } catch (error) {
            console.error(error);
            loadingScreen.setProgress(0, '检查更新失败');
            await sleep(300);
        }
    }

    private registryInput(event: KeyboardEvent): void {
        const code = event.code;
        const world = this.world;

        // 开发者模式
        if (event.ctrlKey) {
            if (code === 'KeyV') this.switchDevMode();
            if (WorldConfig.devMode && world) this.devMode(code, world);
            return;
        }

        switch (code) {
            case 'F11':
                mainWindow.isFullscreen()
                    .then(isFull => mainWindow.setFullscreen(!isFull))
                    .catch(console.error);
                break;
            case 'KeyT':
                WorldConfig.autoShoot = !WorldConfig.autoShoot;
                break;
            case 'Escape': {
                const techTree = document.getElementById('tech-shell')!;
                if (!techTree.classList.contains('hidden')) {
                    world?.toggleTechTree();
                    return;
                }
                world?.togglePause();
                break;
            }
            case 'KeyG':
                world?.toggleTechTree();
                break;
            case 'KeyL':
                WorldConfig.follow = !WorldConfig.follow;
                break;
            case 'KeyM':
                if (this.player) this.player.assistedAiming = !this.player.assistedAiming;
                break;
        }
    }

    public switchDevMode() {
        WorldConfig.devMode = !WorldConfig.devMode;
        WorldConfig.usedDevMode = true;
        this.server?.postMessage({type: 'switch_dev_mode', payload: {dev: WorldConfig.devMode}});
    }

    private devMode(code: string, world: ClientWorld): void {
        const player = this.player;
        if (!player) return;
        this.server?.postMessage({type: 'dev_mode', payload: {code}});
        switch (code) {
            case 'KeyH':
                player.setHealth(player.getMaxHealth());
                break;
            case 'KeyO':
                player.techTree.unlockAll();
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

    private registryListener(): void {
        mainWindow.listen('tauri://blur', () => {
            this.world?.setTicking(false);
        }).catch(console.error);

        mainWindow.listen('tauri://resize', async () => {
            const world = this.world;
            if (!world) return;
            world.rendering = !await mainWindow.isMinimized();
        }).catch(console.error);

        window.addEventListener('resize', () => {
            this.window.resize();
            if (!this.player) return;
            this.networkChannel.send(new RequestPositionC2SPacket(this.player.getUuid()));
        });

        this.window.canvas.addEventListener('click', event => {
            const world = this.world;
            if (world && !world.isTicking) {
                this.window.pauseOverlay.handleClick(event.offsetX, event.offsetY);
            }
        });
    }
}