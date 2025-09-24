// noinspection DuplicatedCode

import {NovaFlightServer} from "./NovaFlightServer.ts";
import {World} from "../world/World.ts";
import {LoadingScreen} from "../render/ui/LoadingScreen.ts";
import {sleep} from "../utils/uit.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {EntityRenderers} from "../render/entity/EntityRenderers.ts";
import {DataLoader} from "../DataLoader.ts";
import {StartScreen} from "../render/ui/StartScreen.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";
import {mainWindow} from "../main.ts";
import {check} from "@tauri-apps/plugin-updater";
import {UITheme} from "../render/ui/theme.ts";

export async function runInnerServer() {
    window.oncontextmenu = event => event.preventDefault();
    const ctrl = new AbortController();
    window.addEventListener('keydown', event => event.preventDefault(), {signal: ctrl.signal});

    World.resize();
    const ctx = World.getCtx();
    ctx.font = UITheme.font;

    const loadingScreen = new LoadingScreen(ctx, World.W, World.H);
    loadingScreen.loop();

    await update(loadingScreen);

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

    await mainWindow.setFullscreen(true);

    World.resize();
    ctx.font = UITheme.font;

    const startScreen = new StartScreen(ctx, {
        title: 'Nova Flight(先行测试版)',
        subtitle: '按 任意键 或 点击按钮 开始',
        buttonText: '开始游戏'
    });
    startScreen.setSize(World.W, World.H);
    startScreen.start();

    AudioManager.randomPlay(Audios.NO_MORE_MABO, Audios.SOME_TIME_HJM);
    AudioManager.setVolume(0.5);

    await startScreen.onConfirm();

    await NovaFlightServer.startGame(manager);
    ctrl.abort();
}

async function update(loadingScreen: LoadingScreen): Promise<void> {
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