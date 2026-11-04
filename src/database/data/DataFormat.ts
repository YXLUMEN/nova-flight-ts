export interface DataRequest {
    type: 'data_ipc';
    id: string;
}

export interface DataResponse<T> {
    type: 'data_ipc';
    id: string;
    result?: T;
    err?: string;
}