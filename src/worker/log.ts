import {Worker2MainType} from "./WorkerMsgType.ts";

export class Log {
    public static info(msg: string) {
        console.log(msg);
        self.postMessage({
            w2m: Worker2MainType.LOG,
            level: 'info',
            message: msg,
        });
    }

    public static warn(msg: string) {
        console.warn(msg);
        self.postMessage({
            w2m: Worker2MainType.LOG,
            level: 'warn',
            message: msg,
        });
    }

    public static error(msg: string) {
        console.error(msg);
        self.postMessage({
            w2m: Worker2MainType.LOG,
            level: 'error',
            message: msg,
        });
    }

    public static message(msg: string, kind: 'info' | 'warning' | 'error' = 'info') {
        console.log(`[${kind}] ${msg}`);
        self.postMessage({
            w2m: Worker2MainType.POPUP,
            kind: kind,
            message: msg,
        });
    }
}