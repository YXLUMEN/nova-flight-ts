export const enum Main2WorkerType {
    START_SERVER,
    STOP_SERVER,
    START_TICKING,
    STOP_TICKING,
    LOADED_SAVE_DATA,
    SAVE_ALL,
    CD_ALL,
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