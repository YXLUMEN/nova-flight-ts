export class Log {
    public static info(msg: string) {
        console.log(msg);
        self.postMessage({
            type: 'log',
            level: 'info',
            message: msg,
        });
    }

    public static warn(msg: string) {
        console.warn(msg);
        self.postMessage({
            type: 'log',
            level: 'warn',
            message: msg,
        });
    }

    public static error(msg: string) {
        console.error(msg);
        self.postMessage({
            type: 'log',
            level: 'error',
            message: msg,
        });
    }

    public static message(msg: string, kind: 'info' | 'warning' | 'error' = 'info') {
        console.log(`[${kind}] ${msg}`);
        self.postMessage({
            type: 'message',
            kind: kind,
            message: msg,
        });
    }
}