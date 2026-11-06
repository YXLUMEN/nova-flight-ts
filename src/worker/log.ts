import {isClient} from "../configs/RuntimeConfig.ts";
import {Worker2MainType} from "./WorkerMsgType.ts";

export class Log {
    public static info(msg: any) {
        console.log(msg);
        if (isClient) return;

        self.postMessage({
            w2m: Worker2MainType.LOG,
            level: 'info',
            message: String(msg),
        });
    }

    public static warn(msg: any) {
        console.warn(msg);
        if (isClient) return;

        self.postMessage({
            w2m: Worker2MainType.LOG,
            level: 'warn',
            message: String(msg),
        });
    }

    public static error(msg: any) {
        console.error(msg);
        if (isClient) return;

        self.postMessage({
            w2m: Worker2MainType.LOG,
            level: 'error',
            message: String(msg),
        });
    }

    public static message(msg: any, kind: 'info' | 'warning' | 'error' = 'info') {
        console.log(`[${kind}] ${msg}`);
        if (isClient) return;

        self.postMessage({
            w2m: Worker2MainType.POPUP,
            kind: kind,
            message: String(msg),
        });
    }
}