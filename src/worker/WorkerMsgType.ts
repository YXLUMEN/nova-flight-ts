export const enum Main2WorkerType {
    START_SERVER,
    STOP_SERVER,
    START_TICKING,
    STOP_TICKING,
    LOADED_SAVE_DATA,
    SAVE_ALL,
    READ_FILE,
    FETCH,
}

export const enum Worker2MainType {
    WORKER_READY,
    SERVER_START,
    SERVER_STOP,
    SERVER_SHUTDOWN,
    SAVED,
    LOG,
    POPUP,
    READ_FILE,
    WRITE_FILE,
    FETCH,
}

export interface RequireRead {
    w2m: number;
    id: number;
    path: string;
}

export interface ResponseRead {
    m2w: number;
    id: number;
    buffer: ArrayBuffer | null;
}

export interface RequireWrite {
    w2m: number;
    path: string;
    buffer: ArrayBuffer;
}

export interface RequireFetch {
    w2m: number;
    id: number;
    url: string;
}