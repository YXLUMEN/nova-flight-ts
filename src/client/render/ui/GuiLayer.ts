import {GuiManager} from "../../gui/GuiManager.ts";
import {PauseScreen} from "./PauseScreen.ts";
import {appEvent} from "../../../event/EventBus.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import {FullScreenNotice} from "./FullScreenNotice.ts";
import type {GuiText} from "../../gui/types.ts";
import type {Consumer} from "../../../type/types.ts";
import {empty} from "../../../utils/uit.ts";
import {GameOverScreen} from "./GameOverScreen.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";

export class GuiLayer {
    private readonly client: NovaFlightClient;
    private readonly gui: GuiManager;

    private pauseScreen: PauseScreen | null = null;
    private noticeScreen: FullScreenNotice | null = null;

    public constructor(client: NovaFlightClient) {
        this.client = client;
        this.gui = client.GUI;
    }

    public start(): void {
        this.gui.start(this.client.window);
        appEvent.on('game:pause', () => this.syncPause());
        appEvent.on('game:over', () => this.onGameOver());
    }

    public closeAll(): void {
        this.gui.clear();
        this.pauseScreen = null;
        this.noticeScreen = null;
    }

    public showNotice(
        message: GuiText,
        label: GuiText | null = null,
        onConfirm: Consumer<void> = empty
    ): FullScreenNotice {
        const notice = this.noticeScreen ??= new FullScreenNotice();

        notice.setOnConfirm(onConfirm);
        notice.setMessage(message);
        notice.setLabel(label);
        this.gui.push(notice);
        return notice;
    }

    public closeNotice(): void {
        this.noticeScreen?.close();
    }

    public hasNotice(): boolean {
        return this.noticeScreen?.isOpen() ?? false;
    }

    private syncPause(): void {
        if (PauseScreen.shouldShow(this.client)) {
            if (this.gui.top() instanceof PauseScreen) return;

            this.pauseScreen ??= new PauseScreen(this.client);
            this.gui.push(this.pauseScreen);
            return;
        }

        if (this.gui.top() instanceof PauseScreen) {
            this.gui.popTop();
        }
    }

    private onGameOver() {
        const world = this.client.world;
        if (!world) return;

        const time = Math.floor(world.getTime()) || 1;
        const score = world.getTotalScore();

        const over = new GameOverScreen(() => this.client.leaveGame());
        over.setSummary(new TranslatableText('hud.summary', [
            time.toString(), score.toString(), (score / time).toFixed(2)]))

        this.gui.push(over);
    }
}
