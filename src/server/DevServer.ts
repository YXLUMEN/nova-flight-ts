import {NovaFlightServer} from "./NovaFlightServer.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {EntityRenderers} from "../render/entity/EntityRenderers.ts";
import {DataLoader} from "../DataLoader.ts";
import {StartScreen} from "../render/ui/StartScreen.ts";
import {WorldScreen} from "../render/WorldScreen.ts";
import {ClientWorld} from "../client/ClientWorld.ts";
import {mainWindow} from "../main.ts";

export class DevServer {
    public static async runServer(): Promise<void> {
        if (NovaFlightServer.serverStart) return;
        NovaFlightServer.serverStart = true;

        NovaFlightServer.registryListener();
        WorldScreen.resize();
        console.warn('当前为开发者模式');

        const manager = new RegistryManager();
        await manager.registerAll();
        EntityRenderers.registryRenders();
        await DataLoader.init(manager);
        manager.frozen();

        ClientWorld.startClient();
        while (true) {
            const startScreen = new StartScreen(WorldScreen.ctx, {
                title: 'Nova Flight(Debug)',
                subtitle: '按 回车/空格 或 点击按钮 开始'
            });
            startScreen.setSize(WorldScreen.VIEW_W, WorldScreen.VIEW_H);
            startScreen.start();

            const action = await startScreen.onConfirm();
            if (action === -1) break;

            await NovaFlightServer.startGame(manager, action === 1);
            await NovaFlightServer.waitForStop();
        }
        await mainWindow.close();
    }
}

