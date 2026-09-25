import type {Consumer} from "../../../type/types.ts";
import {GuiScreen} from "../../gui/GuiScreen.ts";
import {GuiLabel} from "../../gui/widget/GuiLabel.ts";
import {GuiButton} from "../../gui/widget/GuiButton.ts";
import {GuiContainer} from "../../gui/GuiContainer.ts";
import {empty} from "../../../utils/uit.ts";
import type {GuiText} from "../../gui/types.ts";

export class FullScreenNotice extends GuiScreen {
    private static readonly PAD_X = 40;
    private static readonly GAP = 32;

    private readonly box = new GuiContainer()
        .setFlow('column', FullScreenNotice.GAP)
        .setAlign('center');

    private readonly label = new GuiLabel('')
        .setFontSize(24)
        .setWeight('bold')
        .setAlign('center')
        .setColor('#fff');

    private readonly button = new GuiButton('')
        .setSize(120, 40)
        .setVariant('normal')
        .setVisible(false)
        .onClicked(() => this.confirm());

    private onConfirm: Consumer<void> = empty;
    private cancelled = false;
    private resolvers: PromiseWithResolvers<void> = Promise.withResolvers<void>();

    public constructor() {
        super();

        this.background = '#000';
        this.closeOnEscape = false;
        this.box.addAll(this.label, this.button);
        this.add(this.box);
    }

    public setMessage(text: GuiText, fontFamily?: string, fontSize?: number): void {
        this.label.setText(text);
        if (fontFamily) this.label.setFontFamily(fontFamily);
        if (fontSize) this.label.setFontSize(fontSize);
    }

    public setLabel(label: GuiText | null): void {
        this.button.setVisible(label !== null);
        if (label !== null) this.button.setLabel(label);
    }

    public setOnConfirm(callback: Consumer<void>): void {
        this.onConfirm = callback;
    }

    public isCancelled(): boolean {
        return this.cancelled;
    }

    public waitClose(): Promise<void> {
        return this.resolvers.promise;
    }

    public isOpen(): boolean {
        return this.manager !== null;
    }

    private confirm(): void {
        this.close();
        this.onConfirm();
    }

    protected override onOpened(): void {
        this.cancelled = false;
    }

    protected override onClosed(): void {
        this.cancelled = true;
        this.resolvers.resolve();
        this.resolvers = Promise.withResolvers<void>();
    }

    public override relayout(ctx: CanvasRenderingContext2D): void {
        this.box.measure(ctx);

        const contentW = Math.max(0, this.width - FullScreenNotice.PAD_X * 2);
        const groupH = this.label.height +
            (this.button.visible ? FullScreenNotice.GAP + this.button.height : 0);

        this.box.x = FullScreenNotice.PAD_X;
        this.box.y = Math.round((this.height - groupH) / 2);
        this.box.width = contentW;

        super.relayout(ctx);
    }
}