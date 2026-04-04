import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {randInt} from "../../utils/math/math.ts";
import type {TipResource} from "../resource/TipResource.ts";
import {ResourceManager} from "../resource/ResourceManager.ts";
import {Resources} from "../resource/Resources.ts";

export class TipManager {
    public static readonly title: TranslatableText = TranslatableText.of('tips.nova-flight.title');

    private static resource: TipResource | null = null;
    private static interval: number | undefined;
    private static index: number = 0;
    private static current: TranslatableText | null = null;

    public static init(): void {
        this.resource = ResourceManager.get<TipResource>(Resources.TIP);
        this.index = randInt(0, this.resource!.tips.length - 1);
        this.current = this.resource!.tips[this.index];
    }

    public static next(): TranslatableText | null {
        if (this.resource!.tips.length > 0) {
            this.current = this.resource!.tips[this.index];
            this.index = (this.index + 1) % this.resource!.tips.length;
        }
        return this.current;
    }

    public static get() {
        return this.current;
    }

    private static bindNext = this.next.bind(this);

    public static carousel() {
        clearInterval(this.interval);
        this.interval = setInterval(this.bindNext, 8000);
    }

    public static cancel() {
        clearInterval(this.interval);
    }
}