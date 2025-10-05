import {KeyboardInput} from "../input/KeyboardInput.ts";
import {Window} from "./render/Window.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {mainWindow} from "../main.ts";
import {BGMManager} from "../sound/BGMManager.ts";
import {PayloadTypeRegistry} from "../network/PayloadTypeRegistry.ts";
import {ClientNetwork} from "./network/ClientNetwork.ts";
import {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import {StringPacket} from "../network/packet/StringPacket.ts";
import type {UUID} from "../apis/registry.ts";
import {ClientReceive} from "./network/ClientReceive.ts";
import {ClientWorld} from "./ClientWorld.ts";
import type {ClientPlayerEntity} from "./entity/ClientPlayerEntity.ts";
import {LoadingScreen} from "./render/ui/LoadingScreen.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {sleep} from "../utils/uit.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "../DataLoader.ts";
import {check} from "@tauri-apps/plugin-updater";
import {StartScreen} from "./render/ui/StartScreen.ts";
import {DevServer} from "../server/DevServer.ts";
import type {NovaFlightServer} from "../server/NovaFlightServer.ts";

export class NovaFlightClient {
    private static instance: NovaFlightClient;

    public readonly window = new Window();
    public readonly input = new KeyboardInput(this.window.canvas);
    public readonly networkHandler: ClientNetworkChannel;

    private readonly clientId: UUID;
    public world: ClientWorld | null = null;
    public player: ClientPlayerEntity | null = null;
    // @ts-ignore
    private sever: NovaFlightServer | null = null;

    private running: boolean;
    private last = 0;
    private accumulator = 0;
    private readonly waitStop: Promise<void>;
    private readonly onStop: () => void;

    public constructor() {
        NovaFlightClient.instance = this;

        this.clientId = crypto.randomUUID();
        this.networkHandler = new ClientNetworkChannel(
            new WebSocket("ws://localhost:25566"),
            PayloadTypeRegistry.PLAY_C2S,
            this.clientId
        );
        ClientNetwork.registerNetwork();
        ClientReceive.registryNetworkHandler(this.networkHandler);
        this.networkHandler.init();

        this.input.onKeyDown('world_input', this.registryInput.bind(this));
        this.registryListener();

        // BGMManager.init();
        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitStop = promise;
        this.onStop = () => resolve();
        this.running = true;
    }

    public async startClient() {
        this.window.resize();
        const manager = await this.initResources();

        while (true) {
            const startScreen = new StartScreen(this.window.ctx, {
                title: 'Nova Flight(先行测试版)',
                subtitle: '按 任意键 或 点击按钮 开始',
            });
            startScreen.setSize(Window.VIEW_W, Window.VIEW_H);
            startScreen.start();

            const action = await startScreen.onConfirm();
            if (action === -1) break;

            this.world = new ClientWorld(manager);

            const server = DevServer.startServer() as DevServer;
            this.sever = server;

            this.render(0);
            this.world.setTicking(true);

            await server.runServer(manager, action);
            await this.waitStop;
            console.log('stop');
        }
    }

    private render(ts: number) {
        try {
            const world = this.world!;
            if (!this.running) {
                this.onStop();
                return;
            }

            const tickDelta = Math.min(0.05, (ts - this.last) / 1000 || 0);
            this.last = ts;
            this.accumulator += tickDelta;

            while (this.accumulator >= WorldConfig.mbps) {
                this.tick(WorldConfig.mbps);
                this.accumulator -= WorldConfig.mbps;
            }
            world.render();
            requestAnimationFrame(this.bindRender);
        } catch (error) {
            console.error(`Runtime error: ${error}`);
            throw error;
        }
    }

    private bindRender = this.render.bind(this);

    private tick(dt: number) {
        if (this.world && this.world.isTicking) {
            this.world.tick(dt);
        }

        this.window.hud.tick(dt);
        this.input.updateEndFrame();
    }

    public async initResources() {
        const loadingScreen = new LoadingScreen(this.window.ctx);
        loadingScreen.setSize(Window.VIEW_W, Window.VIEW_H);
        loadingScreen.loop();

        await this.update(loadingScreen);

        loadingScreen.setProgress(0.2, '注册资源');
        const manager = new RegistryManager();
        await manager.registerAll();
        await sleep(400);

        loadingScreen.setProgress(0.4, '初始化渲染器');
        EntityRenderers.registryRenders();
        await sleep(400);

        loadingScreen.setProgress(0.6, '加载数据');
        await DataLoader.init(manager);
        await sleep(300);

        loadingScreen.setProgress(0.8, '冻结资源');
        manager.frozen();
        await sleep(400);

        loadingScreen.setProgress(1, '创建世界');
        await sleep(400);
        await loadingScreen.setDone();

        return manager;
    }

    private registryInput(event: KeyboardEvent): void {
        const code = event.code;
        const world = this.world;
        if (!world) return;

        if (event.ctrlKey) {
            if (code === 'KeyV') {
                WorldConfig.devMode = !WorldConfig.devMode;
                WorldConfig.usedDevMode = true;
            }
            if (WorldConfig.devMode) this.devMode(code, world);
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
                    world.toggleTechTree();
                    return;
                }
                world.togglePause();
                break;
            }
            case 'KeyG':
                world.toggleTechTree();
                break;
            case 'KeyM':
                document.getElementById('help')?.classList.toggle('hidden');
                world.setTicking(false);
                break;
        }
    }

    private devMode(code: string, world: ClientWorld): void {
        const player = this.player;
        if (!player) return;

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
            case 'KeyD':
                world.sendPacket(new StringPacket('Hello Server!'));
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

        window.addEventListener('resize', () => this.window.resize());

        this.window.canvas.addEventListener('click', event => {
            const world = this.world;
            if (world && !world.isTicking) {
                this.window.pauseOverlay.handleClick(event.offsetX, event.offsetY);
            }
        });
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
}