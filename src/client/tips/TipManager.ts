import {resolveResource} from "@tauri-apps/api/path";
import {readTextFile} from "@tauri-apps/plugin-fs";
import {error, warn} from "@tauri-apps/plugin-log";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {randInt} from "../../utils/math/math.ts";

export class TipManager {
    public static title: TranslatableText;

    private static interval: number | undefined;
    private static index: number = 0;
    private static current: TranslatableText | null = null;
    private static tips: TranslatableText[] | null = null;

    public static async load(): Promise<void> {
        try {
            const jsonPath = await resolveResource(`resources/nova-flight/tips.json`);
            const json = JSON.parse(await readTextFile(jsonPath));
            if (!Array.isArray(json) || !json.every(item => typeof item === "string")) {
                await warn('Wrong syntax with tips.json');
                return;
            }

            this.tips = json.length === 0 ?
                [TranslatableText.of('')] :
                json.map(item => TranslatableText.of(`tips.${item}`));
            this.title = TranslatableText.of('tips.nova-flight.title');

            this.index = randInt(0, this.tips.length - 1);
            this.current = this.tips[this.index];
        } catch (e) {
            await error(`Could not load tips.json: ${e}`);
        }
    }

    public static next() {
        if (this.tips) {
            this.current = this.tips[this.index];
            this.index = (this.index + 1) % this.tips.length;
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