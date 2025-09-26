// noinspection DuplicatedCode

import {NovaFlightServer} from "./NovaFlightServer.ts";
import {LoadingScreen} from "../render/ui/LoadingScreen.ts";
import {sleep} from "../utils/uit.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {EntityRenderers} from "../render/entity/EntityRenderers.ts";
import {DataLoader} from "../DataLoader.ts";
import {StartScreen} from "../render/ui/StartScreen.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";
import {check} from "@tauri-apps/plugin-updater";
import {WorldScreen} from "../render/WorldScreen.ts";
import {ClientWorld} from "../client/ClientWorld.ts";
import {mainWindow} from "../main.ts";

export class InnerServer {
    public static async runServer(): Promise<void> {
        if (NovaFlightServer.serverStart) return;
        NovaFlightServer.serverStart = true;

        NovaFlightServer.registryListener();
        WorldScreen.resize();

        const loadingScreen = new LoadingScreen(WorldScreen.ctx);
        loadingScreen.setSize(WorldScreen.VIEW_W, WorldScreen.VIEW_H);
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

        ClientWorld.startClient();
        while (true) {
            const startScreen = new StartScreen(WorldScreen.ctx, {
                title: 'Nova Flight(先行测试版)',
                subtitle: '按 任意键 或 点击按钮 开始',
            });
            startScreen.setSize(WorldScreen.VIEW_W, WorldScreen.VIEW_H);
            startScreen.start();

            AudioManager.randomPlay(Audios.NO_MORE_MABO, Audios.SOME_TIME_HJM, Audios.SPACE_WALK, Audios.COME_ON_MABO);
            AudioManager.setVolume(0.5);

            const action = await startScreen.onConfirm();
            if (action === -1) break;

            await NovaFlightServer.startGame(manager, action === 1);
            await NovaFlightServer.waitForStop();
        }
        await mainWindow.close();
    }

    private static async update(loadingScreen: LoadingScreen): Promise<void> {
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

