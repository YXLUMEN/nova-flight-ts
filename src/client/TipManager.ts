import type {TipResource} from "../resource/TipResource.ts";
import type {TranslatableText} from "../i18n/TranslatableText.ts";
import {randInt} from "../utils/math/math.ts";
import {appEvent} from "../event/EventBus.ts";
import {ResourceManager} from "../resource/ResourceManager.ts";
import {Resources} from "../resource/Resources.ts";
import {TipChange} from "../event/events/ui/TipChange.ts";
import {Settings} from "./settings/Settings.ts";

export class TipManager {
    private static resource: TipResource | null = null;
    private static interval: number | undefined;
    private static index: number = 0;
    private static current: TranslatableText | null = null;

    public static init(): void {
        this.resource = ResourceManager.get<TipResource>(Resources.TIP);
        this.index = randInt(0, this.resource!.tips.length - 1);
        this.current = this.resource!.tips[this.index];

        appEvent.on('game:pause', ({paused}) => paused ? this.carousel() : this.cancel());
    }

    public static next(): TranslatableText | null {
        const self = TipManager;
        if (self.resource!.tips.length > 0) {
            self.current = self.resource!.tips[self.index];
            self.index = (self.index + 1) % self.resource!.tips.length;
        }

        appEvent.emit(new TipChange(self.current));
        return self.current;
    }

    public static get(): TranslatableText | null {
        return this.current;
    }

    public static carousel() {
        clearInterval(this.interval);
        this.interval = setInterval(this.next, Settings.TIP_INTERVAL.get());
    }

    public static cancel() {
        clearInterval(this.interval);
    }
}