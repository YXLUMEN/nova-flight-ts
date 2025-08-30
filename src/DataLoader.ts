export class DataLoader {
    private static readonly DATA_MAP = new Map<string, any>();

    public static async init() {
        const resp = await fetch('/data/tech-data.json');
        const techs = await resp.json();
        this.DATA_MAP.set('tech-data', techs);
    }

    public static get(dataName: string): any {
        return this.DATA_MAP.get(dataName);
    }
}