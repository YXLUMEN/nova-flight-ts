import {LoadingScreen} from "./render/ui/LoadingScreen.ts";
import {Window} from "./render/Window.ts";
import {sleep} from "../utils/uit.ts";
import {ClientTechManager} from "./tech/ClientTechManager.ts";
import {DataLoader} from "../resource/DataLoader.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {RenderLoader} from "./render/RenderLoader.ts";
import {check} from "@tauri-apps/plugin-updater";
import {confirm} from "@tauri-apps/plugin-dialog";
import type {NovaFlightClient} from "./NovaFlightClient.ts";

export class ClientInit {
    private readonly client: NovaFlightClient;

    public constructor(client: NovaFlightClient) {
        this.client = client;
    }

    public async initResources(): Promise<void> {
        const loadingScreen = new LoadingScreen(this.client);
        loadingScreen.setSize(Window.VIEW_W, Window.VIEW_H);
        loadingScreen.loop();

        await this.update(loadingScreen);

        loadingScreen.setProgress(0.1, '加载依赖');
        await this.initWasm();
        await sleep(100);

        loadingScreen.setProgress(0.2, '注册资源');
        const manager = this.client.registryManager;
        await manager.registerAll();
        ClientTechManager.init();
        await sleep(200);

        loadingScreen.setProgress(0.4, '加载资源');
        await DataLoader.registerAndLoad(manager, loadingScreen);
        this.client.globalSound = new SoundSystem();

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

    private async initWasm(): Promise<void> {
        await (await import('@bokuweb/zstd-wasm')).init();
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
}