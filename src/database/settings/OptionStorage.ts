export interface OptionStorage {
    load(): Promise<string | null>;

    save(json: string): Promise<void>;
}