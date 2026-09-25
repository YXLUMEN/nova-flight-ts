import {GuiScreen} from "../../gui/GuiScreen.ts";
import {GuiLabel} from "../../gui/widget/GuiLabel.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {GuiContainer} from "../../gui/GuiContainer.ts";
import {GuiButton} from "../../gui/widget/GuiButton.ts";
import type {GuiText} from "../../gui/types.ts";
import type {Consumer} from "../../../type/types.ts";

export class GameOverScreen extends GuiScreen {
    private readonly box = new GuiContainer()
        .setFlow('column', 32)
        .setAlign('center');

    private readonly title = new GuiLabel(TranslatableText.of('hud.game_over'))
        .setWeight('bold')
        .setFontSize(32);

    private readonly summary = new GuiLabel('')
        .setFontSize(16);

    private readonly button = new GuiButton(TranslatableText.of('hud.back'))
        .setSize(0, 40)
        .setVariant('normal');

    public constructor(callback: Consumer<void>) {
        super();

        this.background = 'rgba(255,0,0,0.3)';
        this.closeOnEscape = false;

        this.button.onClicked(() => {
            this.close();
            callback();
        });
        this.box.addAll(this.title, this.summary, this.button);
        this.add(this.box);
    }

    public setSummary(text: GuiText) {
        this.summary.setText(text);
    }

    public override relayout(ctx: CanvasRenderingContext2D): void {
        this.box.measure(ctx);

        const contentW = Math.max(0, this.width - 40);
        const groupH = this.title.height + this.summary.height + this.button.height;

        this.box.x = 20;
        this.box.y = Math.round((this.height - groupH) / 2) - 64;
        this.box.width = contentW;

        super.relayout(ctx);
    }
}