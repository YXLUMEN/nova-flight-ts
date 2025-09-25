// noinspection DuplicatedCode

import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {EntityRenderers} from "../render/entity/EntityRenderers.ts";
import {DataLoader} from "../DataLoader.ts";
import {StartScreen} from "../render/ui/StartScreen.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";
import {UITheme} from "../render/ui/theme.ts";
import {WorldScreen} from "../render/WorldScreen.ts";

export async function runDevServer() {
    window.oncontextmenu = event => event.preventDefault();
    const ctrl = new AbortController();
    window.addEventListener('keydown', event => event.preventDefault(), {signal: ctrl.signal});
    NovaFlightServer.registryListener();

    console.warn('当前为开发者模式');

    const manager = new RegistryManager();
    await manager.registerAll();

    EntityRenderers.registryRenders();

    await DataLoader.init(manager);

    manager.frozen();

    WorldScreen.resize();
    WorldScreen.ctx.font = UITheme.font;

    const startScreen = new StartScreen(WorldScreen.ctx, {
        title: 'Nova Flight(Debug)',
        subtitle: '按 回车/空格 或 点击按钮 开始'
    });
    startScreen.setSize(WorldScreen.VIEW_W, WorldScreen.VIEW_H);
    startScreen.start();

    AudioManager.playAudio(Audios.COME_ON_MABO);
    AudioManager.setVolume(0.3);

    await startScreen.onConfirm();

    await NovaFlightServer.startGame(manager);
    ctrl.abort();
}