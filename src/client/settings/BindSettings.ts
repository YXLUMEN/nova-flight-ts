import {RuntimeConfig} from "../../configs/RuntimeConfig.ts";
import {Settings} from "./Settings.ts";

export class BindSettings {
    public static init() {
        Settings.FPS.onChange(v => RuntimeConfig.perFrame = 1000 / v);
        RuntimeConfig.perFrame = 1000 / Settings.FPS.get();
    }
}