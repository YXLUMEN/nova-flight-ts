export interface CommandOutput {
    sendMessage(msg: string): void;

    sendTranslatable(key: string, args?: string[]): void;

    shouldTrackOutput(): boolean;

    cannotBeSilenced(): boolean;
}