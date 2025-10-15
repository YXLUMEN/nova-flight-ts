import {KeyboardInput} from "./input/KeyboardInput.ts";
import {Window} from "./render/Window.ts";
import {isDev, WorldConfig} from "../configs/WorldConfig.ts";
import {mainWindow} from "../main.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import type {UUID} from "../apis/registry.ts";
import {ClientReceive} from "./network/ClientReceive.ts";
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
import {UUIDUtil} from "../utils/UUIDUtil.ts";

export class NovaFlightClient {
    private static instance: NovaFlightClient;

    public readonly window: Window;
    public readonly input: KeyboardInput;
    public readonly networkChannel: ClientNetworkChannel;
    public networkHandler: ClientPlayNetworkHandler | null = null;

    public readonly clientId: UUID;
    public readonly registryManager: RegistryManager;

    public world: ClientWorld | null = null;
    public player: ClientPlayerEntity | null = null;
    private server: Worker | null = null;

    private running: boolean;
    private last = 0;
    private accumulator = 0;

    private waitWorldStop: Promise<void> | null = null;
    private onWorldStop!: () => void;
    private bindRender = this.render.bind(this);

    public constructor() {
        NovaFlightClient.instance = this;

        const clientId = localStorage.getItem("clientId");
        if (clientId && UUIDUtil.isValidUUID(clientId)) {
            this.clientId = clientId;
        } else {
            alert('ID 不合法或不存在,将重新生成');
            this.clientId = crypto.randomUUID();
            localStorage.setItem('clientId', this.clientId);
        }
        this.registryManager = new RegistryManager();

        this.window = new Window();
        this.input = new KeyboardInput(this.window.canvas);

        this.networkChannel = new ClientNetworkChannel(
            new WebSocket('ws://localhost:25566'),
            this.clientId
        );
        ClientReceive.registryNetworkHandler(this.networkChannel);
        this.networkChannel.init();

        this.input.onKeyDown('world_input', this.registryInput.bind(this));
        this.registryListener();

        // BGMManager.init();
        this.createPromise();
        this.running = true;
    }

    public async startClient() {
        this.window.resize();
        await this.initResources();
        if (!isDev) await mainWindow.setFullscreen(true);

        this.networkHandler = new ClientPlayNetworkHandler(this);

        while (true) {
            if (this.waitWorldStop === null) this.createPromise();
            this.networkHandler.registryHandler();

            const startScreen = new StartScreen(this.window.ctx, {
                title: `Nova Flight (${WorldConfig.version})`,
                subtitle: '按 任意键 或 点击按钮 开始',
            });
            startScreen.setSize(Window.VIEW_W, Window.VIEW_H);
            startScreen.start();

            const action = await startScreen.onConfirm();
            if (action === -1) break;
            if (action < 2) {
                this.startIntegratedServer(action);
            }

            await this.waitWorldStop;
            this.networkHandler.clear();
        }

        this.networkHandler.clear();
        this.networkHandler = null;
        this.networkChannel.disconnect();
        this.scheduleStop();
    }

    public joinGame(world: ClientWorld) {
        this.world = world;
        this.render(0);
    }

    private render(ts: number) {
        try {
            const world = this.world;
            if (!world) return;
            if (!this.running) {
                this.onWorldStop();
                return;
            }

            const tickDelta = Math.min(0.1, (ts - this.last) / 1000 || 0);
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
            this.onWorldStop();
        }
    }

    private tickWorld(dt: number) {
        if (this.world && this.world.isTicking) {
            this.world.tick(dt);
        }

        this.window.hud.tick(dt);
        this.input.updateEndFrame();
    }

    private createPromise(): void {
        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitWorldStop = promise;
        this.onWorldStop = () => {
            if (!this.waitWorldStop) return;

            resolve();
            this.clearWorld();
            this.last = 0;
            this.accumulator = 0;
            this.server?.postMessage({type: 'stop_server'});
            this.waitWorldStop = null;
        };
    }

    public startIntegratedServer(action: number) {
        if (this.server) return;

        this.server = new Worker(new URL('../worker/dev.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        });

        this.server.postMessage({type: 'start_server', payload: {action}});

        this.server.onmessage = async (event) => {
            const {type, payload} = event.data;

            if (type === 'save_game') {
                return this.saveGame(payload);
            }
            if (type === 'load_save') {
                const nbt = await this.loadSave();
                if (!nbt) return;
                this.server!.postMessage({type: 'loaded_save_data', data: nbt.toBinary()});
                return;
            }
            if (type === 'server_shutdown') {
                this.onWorldStop();
                return;
            }
            if (type === 'stopped') {
                if (!this.server) return;
                this.server.terminate();
                this.server = null;
                return;
            }
        };

        this.server.onerror = async err => {
            console.error('Server Thread:', err);

            let stack = '';
            if (err.error instanceof Error) {
                stack = err.error.stack ?? '';
            }
            await error(`${err.type}: ${err.message} at ${stack}`);
            this.onWorldStop();
        }
    }

    private clearWorld() {
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
            return NbtCompound.fromBinary(bytes);
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    public getServer(): Worker | null {
        return this.server;
    }

    public isRunning(): boolean {
        return this.running;
    }

    public scheduleStop() {
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

            const update = await check();
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
            loadingScreen.setProgress(0, '下载失败');
            await sleep(300);
        }
    }

    private registryInput(event: KeyboardEvent): void {
        const code = event.code;
        const world = this.world;

        if (event.ctrlKey) {
            if (code === 'KeyV') {
                WorldConfig.devMode = !WorldConfig.devMode;
                WorldConfig.usedDevMode = true;
                this.server?.postMessage({type: 'switch_dev_mode'});
            }
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
            case 'KeyM':
                document.getElementById('help')?.classList.toggle('hidden');
                world?.setTicking(false);
                break;
        }
    }

    private devMode(code: string, world: ClientWorld): void {
        const player = this.player;
        if (!player) return;
        this.server?.postMessage({type: 'dev_mode', payload: {code}});
        switch (code) {
            case 'KeyK':
                player.addPhaseScore(200);
                break;
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