import {World} from "./world/World.ts";
import {RegistryManager} from "./registry/RegistryManager.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "./DataLoader.ts";
import {Window} from "@tauri-apps/api/window";
import {check} from "@tauri-apps/plugin-updater";
import {LoadingScreen} from "./render/ui/LoadingScreen.ts";
import {sleep} from "./utils/uit.ts";
import {StartScreen} from "./render/ui/StartScreen.ts";
import {isDev} from "./configs/WorldConfig.ts";
import {NovaFlightServer} from "./NovaFlightServer.ts";
import {AudioManager} from "./sound/AudioManager.ts";
import {Audios} from "./sound/Audios.ts";

export const mainWindow = new Window('main');

async function main() {
    window.oncontextmenu = event => event.preventDefault();
    World.resize();

    const loadingScreen = new LoadingScreen(World.getCtx(), World.W, World.H);
    loadingScreen.loop();

    try {
        loadingScreen.setProgress(0, '检测更新');
        await sleep(200);
        const update = await check();
        if (update && confirm('发现更新')) {
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
            return;
        }
    } catch (error) {
        console.error(error);
        loadingScreen.setProgress(0, '下载失败');
        await sleep(300);
    }

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
    const startScreen = new StartScreen(World.getCtx(), {
        title: 'Nova Flight(先行测试版)',
        subtitle: '按 任意键 或 点击按钮 开始',
        buttonText: '开始游戏'
    });
    startScreen.setWorldSize(World.W, World.H);
    startScreen.start();

    AudioManager.randomPlay(true, Audios.NO_MORE_MABO, Audios.SOME_TIME_HJM);
    await startScreen.onConfirm();
    if (localStorage.getItem('guided') !== undefined) {
        AudioManager.playAudio(Audios.SPACE_WALK);
    }

    await NovaFlightServer.startGame(manager);
}

async function mainDev() {
    window.oncontextmenu = event => event.preventDefault();

    console.warn('当前为开发者模式');

    const manager = new RegistryManager();
    await manager.registerAll();

    EntityRenderers.registryRenders();

    await DataLoader.init(manager);

    manager.frozen();

    World.resize();
    const startScreen = new StartScreen(World.getCtx(), {
        title: 'Nova Flight(Debug)',
        subtitle: '按 回车/空格 或 点击按钮 开始',
        buttonText: '开始游戏'
    });
    startScreen.setWorldSize(World.W, World.H);
    startScreen.start();

    AudioManager.randomPlay(true, Audios.NO_MORE_MABO, Audios.SOME_TIME_HJM);
    await startScreen.onConfirm();
    if (localStorage.getItem('guided') !== undefined) {
        AudioManager.playAudio(Audios.SPACE_WALK);
    }

    await NovaFlightServer.startGame(manager);
}


if (isDev) {
    mainDev().then(() => {
        const date = new Date();
        const time = date.toLocaleString('zh-CN', {timeZone: 'Asia/ShangHai'});
        console.log('Game started', time);
    });
} else {
    main().then();
}