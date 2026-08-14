import {UITheme} from "./theme.ts";
import type {Consumer} from "../../../type/types.ts";
import type {TranslatableText} from "../../../i18n/TranslatableText.ts";

export class UIButton {
    public readonly x: number;
    public readonly y: number;
    public readonly width: number;
    public readonly height: number;

    public label: string | TranslatableText;
    public onClick: Consumer<void>;

    public constructor(
        x: number,
        y: number,
        width: number,
        height: number,
        label: string | TranslatableText,
        onClick: Consumer<void>
    ) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.label = label;
        this.onClick = onClick;
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = UITheme.background;
        ctx.strokeStyle = UITheme.accent;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, UITheme.borderRadius);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = UITheme.foreground;
        ctx.fillText(this.label.toString(), this.x + this.width / 2, this.y + this.height / 2);
    }

    public hitTest(mx: number, my: number) {
        return mx >= this.x &&
            mx <= this.x + this.width &&
            my >= this.y &&
            my <= this.y + this.height;
    }
}