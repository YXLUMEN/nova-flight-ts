import type {GuiButtonVariant} from "../../gui/types.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {Consumer} from "../../../type/types.ts";
import {GuiContainer} from "../../gui/GuiContainer.ts";
import {GuiScreen} from "../../gui/GuiScreen.ts";
import {GuiButton} from "../../gui/widget/GuiButton.ts";
import {GuiLabel} from "../../gui/widget/GuiLabel.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {TipManager} from "../../tips/TipManager.ts";
import {appEvent} from "../../../event/EventBus.ts";
import {NewNotify} from "../../../event/events/NewNotify.ts";

export class PauseScreen extends GuiScreen {
    private static readonly MENU_WIDTH = 200;
    private static readonly BUTTON_WIDTH = 150;
    private static readonly BUTTON_HEIGHT = 36;
    // 菜单相对屏幕垂直中心的偏移(让按钮组落在中心附近)
    private static readonly MENU_OFFSET_Y = -140;

    private readonly client: NovaFlightClient;

    private readonly menu = new GuiContainer()
        .setFlow('column', 14)
        .setAlign('center');

    private readonly tipBox = new GuiContainer()
        .setFlow('column', 4)
        .setAlign('end');

    private readonly tipTitle = new GuiLabel(TipManager.title)
        .setFontSize(20)
        .setAlign('end')
        .setColor('rgb(255,233,174)');

    private readonly tip = new GuiLabel('').setFontSize(16).setAlign('end');

    public constructor(client: NovaFlightClient) {
        super();

        this.client = client;
        this.background = 'rgba(0,0,0,0.45)';
        this.closeOnEscape = false; // Esc 由游戏处理以保持 pause 状态一致

        this.menu.addAll(
            new GuiLabel(TranslatableText.of('pause.paused')).setFontSize(32).setWeight(700),
            new GuiLabel(TranslatableText.of('pause.press_esc')).setFontSize(16),
            this.createButton('pause.back_to_game', 'primary', () => this.client.setPause(false)),
            this.createButton('pause.settings', 'normal', () => appEvent.emit(new NewNotify('WIP'))),
            this.createButton('pause.save', 'normal', () => void this.client.saveAll()),
            this.createButton('pause.save_and_exit', 'danger', () => this.client.leaveGame()),
        );

        this.tipBox.addAll(this.tipTitle, this.tip);
        this.addAll(this.menu, this.tipBox);
    }

    public override relayout(ctx: CanvasRenderingContext2D): void {
        // 直接写 x/y:布局过程中再走 setter 会重新标脏,导致每帧重排
        this.menu.width = PauseScreen.MENU_WIDTH;
        this.menu.x = (this.width - PauseScreen.MENU_WIDTH) / 2;
        this.menu.y = this.height / 2 + PauseScreen.MENU_OFFSET_Y;

        this.tipBox.width = Math.max(0, this.width - 20);
        this.tipBox.x = 10;
        this.tipBox.y = this.height - 90;

        super.relayout(ctx);
    }

    public override tick(dt: number): void {
        super.tick(dt);

        const tip = TipManager.get();
        const text = tip === null ? '' : tip;
        if (this.tip.getText() !== text) this.tip.setText(text);

        if (!PauseScreen.shouldShow(this.client)) this.close();
    }

    private createButton(label: string, variant: GuiButtonVariant, onClick: Consumer<void>): GuiButton {
        return new GuiButton(TranslatableText.of(label))
            .setVariant(variant)
            .setSize(PauseScreen.BUTTON_WIDTH, PauseScreen.BUTTON_HEIGHT)
            .onClicked(onClick);
    }

    public static shouldShow(client: NovaFlightClient): boolean {
        const player = client.player;
        const world = client.world;
        return client.isPause() && world !== null && !world.isOver() &&
            player !== null && !player.isOpenInventory();
    }
}
