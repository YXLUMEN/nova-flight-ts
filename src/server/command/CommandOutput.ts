export interface CommandOutput {
    sendMessage(msg: string): void;

    shouldTrackOutput(): boolean;

    cannotBeSilenced(): boolean;
}