export function info(msg: string) {
    console.log(msg);
    self.postMessage({
        type: 'log',
        level: 'info',
        message: msg,
    });
}

export function warn(msg: string) {
    console.warn(msg);
    self.postMessage({
        type: 'log',
        level: 'warn',
        message: msg,
    });
}

export function error(msg: string) {
    console.error(msg);
    self.postMessage({
        type: 'log',
        level: 'error',
        message: msg,
    });
}