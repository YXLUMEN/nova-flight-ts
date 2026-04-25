export interface EntityAi {
    isDisabled(): boolean;

    setDisable(value: boolean): void;

    tick(): void;

    decision(): void;
}