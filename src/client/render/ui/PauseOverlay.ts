import {UIButton} from "./UIButton.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import {TipManager} from "../../tips/TipManager.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {UiFramework} from "./UiFramework.ts";
import {EventBus} from "../../../event/EventBus.ts";
import {NewNotify} from "../../../event/events/NewNotify.ts";

export class PauseOverlay extends UiFramework {
    private readonly text: TranslatableText[];
    private readonly buttons: UIButton[] = [];
    private pulse = 1;

    public constructor() {
        super();

        this.text = [
            TranslatableText.of('pause.back_to_game'),
            TranslatableText.of('pause.settings'),
            TranslatableText.of('pause.save'),
            TranslatableText.of('pause.save_and_exit'),
            TranslatableText.of('pause.paused'),
            TranslatableText.of('pause.press_esc'),
        ];
    }

    public setSize(w: number, h: number) {
        super.setSize(w, h);
        this.layoutButtons();
    }

    private layoutButtons() {
        const centerX = this.halfW;
        const centerY = this.halfH;

        this.buttons.length = 0;
        this.buttons.push(
            new UIButton(
                centerX - 60, centerY - 50,
                120, 36,
                this.text[0],
                () => {
                    const client = NovaFlightClient.getInstance();
                    client.setPause(!client.isPause());
                }),
            new UIButton(
                centerX - 60, centerY,
                120, 36,
                this.text[1],
                () => {
                    EventBus.instance().emit(new NewNotify('WIP'));
                }),
            new UIButton(
                centerX - 60, centerY + 50,
                120, 36,
                this.text[2],
                () => NovaFlightClient.getInstance().world!.saveAll()),
            new UIButton(
                centerX - 60, centerY + 100,
                120, 36,
                this.text[3],
                () => NovaFlightClient.getInstance().leaveGame()),
        );
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, this.width, this.height);

        // 脉冲
        const t = performance.now() * 0.002;
        this.pulse = 0.75 + 0.25 * Math.sin(t);

        // 主标题
        ctx.fillStyle = `rgba(255,255,255,${this.pulse.toFixed(3)})`;
        ctx.font = 'bold 32px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        ctx.fillText(this.text[4].toString(), this.halfW, this.halfH - 100);

        // 副提示
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '16px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        ctx.fillText(this.text[5].toString(), this.halfW, this.halfH - 70);

        // 按钮
        for (const btn of this.buttons) {
            btn.render(ctx);
        }

        const tipText = TipManager.get();
        if (tipText !== null) {
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";

            let height = this.height - 50;
            const left = this.width - 10;
            ctx.fillStyle = 'rgb(255,233,174)';
            ctx.font = '20px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
            ctx.fillText(TipManager.title.toString(), left, height);

            height += 30;
            ctx.fillStyle = 'rgb(255,255,255)';
            ctx.font = '16px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
            ctx.fillText(tipText.toString(), left, height);
        }

        ctx.restore();
    }

    public handleClick(mouseX: number, mouseY: number) {
        for (const btn of this.buttons) {
            if (btn.hitTest(mouseX, mouseY)) {
                btn.onClick();
                return true;
            }
        }
        return false;
    }

    public destroy() {
        this.buttons.length = 0;
        this.text.length = 0;
    }
}
