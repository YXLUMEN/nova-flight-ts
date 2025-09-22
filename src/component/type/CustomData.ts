type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export class CustomData {
    private data: Record<string, JsonValue>;

    public constructor(data: Record<string, JsonValue> = {}) {
        this.data = data;
    }

    public getData(): Readonly<Record<string, JsonValue>> {
        return this.data;
    }

    public set(field: string, value: JsonValue): void {
        this.data[field] = value;
    }

    public get<T extends JsonValue = JsonValue>(field: string): T | undefined {
        return this.data[field] as T;
    }

    public has(field: string): boolean {
        return field in this.data;
    }

    public merge(newData: Record<string, JsonValue>): void {
        this.data = {...this.data, ...newData};
    }
}