import {GuiManager} from "../../gui/GuiManager.ts";
import {PauseScreen} from "./PauseScreen.ts";
import {appEvent} from "../../../event/EventBus.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";

export class GuiLayer {
    private readonly client: NovaFlightClient;
    private readonly gui: GuiManager;

    private pauseScreen: PauseScreen | null = null;

    public constructor(client: NovaFlightClient) {
        this.client = client;
        this.gui = client.GUI;
    }

    public start(): void {
        this.gui.start(this.client.window);
        appEvent.on('game:pause', () => this.syncPause());
    }

    public closeAll(): void {
        this.gui.clear();
        this.pauseScreen = null;
    }

    private syncPause(): void {
        if (PauseScreen.shouldShow(this.client)) {
            if (this.gui.top() instanceof PauseScreen) return;

            if (!this.pauseScreen) this.pauseScreen = new PauseScreen(this.client)
            this.gui.push(this.pauseScreen);
            return;
        }

        if (this.gui.top() instanceof PauseScreen) {
            this.gui.popTop();
        }
    }
}
