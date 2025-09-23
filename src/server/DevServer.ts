// noinspection DuplicatedCode

import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {EntityRenderers} from "../render/entity/EntityRenderers.ts";
import {DataLoader} from "../DataLoader.ts";
import {World} from "../world/World.ts";
import {StartScreen} from "../render/ui/StartScreen.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";

export async function runDevServer() {
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

    AudioManager.randomPlay(Audios.NO_MORE_MABO, Audios.SOME_TIME_HJM);
    AudioManager.setVolume(0.5);

    await startScreen.onConfirm();

    await NovaFlightServer.startGame(manager);
}