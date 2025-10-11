import {KeyboardInput} from "./input/KeyboardInput.ts";
import {Window} from "./render/Window.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
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
    // @ts-ignore
    private server: Worker | null = null;

    private running: boolean;
    private last = 0;
    private accumulator = 0;

    private waitStop!: Promise<void> | null;
    private onStop!: () => void;
    private bindRender = this.render.bind(this);

    public constructor() {
        NovaFlightClient.instance = this;

        this.clientId = crypto.randomUUID();
        this.registryManager = new RegistryManager();

        this.window = new Window();
        this.input = new KeyboardInput(this.window.canvas);

        this.networkChannel = new ClientNetworkChannel(
            new WebSocket("ws://localhost:25566"),
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
        if (this.waitStop === null) this.createPromise();

        this.window.resize();
        await this.initResources();

        while (true) {
            const startScreen = new StartScreen(this.window.ctx, {
                title: 'Nova Flight (25w07a)',
                subtitle: '按 任意键 或 点击按钮 开始',
            });
            startScreen.setSize(Window.VIEW_W, Window.VIEW_H);
            startScreen.start();

            const action = await startScreen.onConfirm();
            if (action === -1) break;
            if (action < 2) {
                this.startIntegratedServer(action);
            }

            await this.waitStop;
        }
        this.networkChannel.disconnect();
    }

    public startIntegratedServer(action: number) {
        this.networkHandler = new ClientPlayNetworkHandler(this);
        this.networkHandler.registryHandler();

        this.server = new Worker(new URL('../worker/server.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        });
        this.server.postMessage({type: "start", payload: {action}});
        this.server.onmessage = event => {
            console.log("Worker:", event.data);
        };
        this.server.onerror = error => {
            console.error("Worker:", error);
            this.onStop();
        }
    }

    public joinGame(world: ClientWorld) {
        this.world = world;
        this.render(0);
    }

    private render(ts: number) {
        try {
            const world = this.world!;
            if (!this.running) {
                this.onStop();
                return;
            }

            const tickDelta = Math.min(0.1, (ts - this.last) / 1000 || 0);
            this.last = ts;
            this.accumulator += tickDelta;

            while (this.accumulator >= WorldConfig.mbps) {
                this.tick(WorldConfig.mbps);
                this.accumulator -= WorldConfig.mbps;
            }

            const alpha = world.isTicking ? this.accumulator / WorldConfig.mbps : 1;
            world.render(alpha);
            requestAnimationFrame(this.bindRender);
        } catch (error) {
            console.error(`Runtime error: ${error}`);
            console.error(error);
            this.onStop();
        }
    }

    private tick(dt: number) {
        if (this.world && this.world.isTicking) {
            this.world.tick(dt);
        }

        this.window.hud.tick(dt);
        this.input.updateEndFrame();
    }

    public async initResources(): Promise<void> {
        const loadingScreen = new LoadingScreen(this.window.ctx);
        loadingScreen.setSize(Window.VIEW_W, Window.VIEW_H);
        loadingScreen.loop();

        await this.update(loadingScreen);

        loadingScreen.setProgress(0.2, '注册资源');
        const manager = this.registryManager;
        await manager.registerAll();
        // await sleep(400);

        loadingScreen.setProgress(0.4, '初始化渲染器');
        EntityRenderers.registryRenders();
        // await sleep(400);

        loadingScreen.setProgress(0.6, '加载数据');
        await DataLoader.init(manager);
        // await sleep(300);

        loadingScreen.setProgress(0.8, '冻结资源');
        manager.frozen();
        // await sleep(400);

        loadingScreen.setProgress(1, '创建世界');
        // await sleep(400);
        await loadingScreen.setDone();
    }

    private registryInput(event: KeyboardEvent): void {
        const code = event.code;
        const world = this.world;
        if (!world) return;

        if (event.ctrlKey) {
            if (code === 'KeyV') {
                WorldConfig.devMode = !WorldConfig.devMode;
                WorldConfig.usedDevMode = true;
                this.server?.postMessage({type: 'switch_dev_mode'});
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

    private createPromise(): void {
        const {promise, resolve} = Promise.withResolvers<void>();
        this.waitStop = promise;
        this.onStop = () => {
            resolve();
            this.server?.postMessage({type: 'stop'});
            this.waitStop = null;
        };
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