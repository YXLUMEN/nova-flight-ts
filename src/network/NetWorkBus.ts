export interface NetWorkBus {
    getSessionId(): number;

    isConnected(): boolean;

    connect(): Promise<void>;

    disconnect(): void;

    sniff(
        retryDelay?: number,
        maxRetries?: number,
        onTry?: (attempts: number, maxRetries: number) => boolean
    ): Promise<boolean>;
}