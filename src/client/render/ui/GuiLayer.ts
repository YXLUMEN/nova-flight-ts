import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {GuiText} from "../../page/types.ts";
import type {Consumer} from "../../../type/types.ts";
import {empty} from "../../../utils/uit.ts";
import {appEvent} from "../../../event/EventBus.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {PauseScreen} from "../../page/compound/PauseScreen.ts";
import {FullscreenNotice} from "../../page/compound/FullscreenNotice.ts";
import {GameOverScreen} from "../../page/compound/GameOverScreen.ts";
import {GuiManager} from "../../page/GuiManager.ts";

export class GuiLayer {
    public readonly gui: GuiManager;
    private readonly client: NovaFlightClient;

    private pauseScreen: PauseScreen | null = null;
    private noticeScreen: FullscreenNotice | null = null;

    public constructor(client: NovaFlightClient) {
        this.client = client;
        this.gui = new GuiManager(document.getElementById('gui')!);
    }

    public start(): void {
        appEvent.on('game:pause', () => this.syncPause());
        appEvent.on('game:over', () => this.onGameOver());
    }

    public closeAll(): void {
        this.gui.destroyAll();
        this.pauseScreen?.destroy();
        this.noticeScreen?.destroy();
        this.pauseScreen = null;
        this.noticeScreen = null;
    }

    public showNotice(
        message: GuiText,
        label: GuiText | null = null,
        onConfirm: Consumer<void> = empty
    ): FullscreenNotice {
        const notice = this.noticeScreen ??= new FullscreenNotice();

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
        return this.noticeScreen?.isShow() ?? false;
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
        this.gui.clear();
        this.gui.push(over);
    }
}
