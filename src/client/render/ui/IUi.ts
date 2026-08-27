import type {TranslatableText} from "../../../i18n/TranslatableText.ts";

export interface IUi {
    tick?(tickDelta: number): void;

    render(ctx: CanvasRenderingContext2D, alpha: number): void;

    setSize(w: number, h: number): void;

    destroy(reason?: string | TranslatableText): void;
}