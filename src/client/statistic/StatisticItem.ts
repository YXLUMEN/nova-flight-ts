export interface StatisticItem {
    getName(): string;

    render(): Promise<HTMLElement>;
}