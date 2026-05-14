export function getCompactTimestamp(): string {
    const now = Temporal.Now.plainDateTimeISO();
    const y = now.year;
    const m = now.month.toString().padStart(2, '0');
    const d = now.day.toString().padStart(2, '0');
    const h = now.hour.toString().padStart(2, '0');
    const min = now.minute.toString().padStart(2, '0');
    const s = now.second.toString().padStart(2, '0');

    return `${y}${m}${d}_${h}${min}${s}`;
}

export function ISOTime(): string {
    const now = Temporal.Now.zonedDateTimeISO();
    return now.toString({smallestUnit: 'millisecond'});
}

export function toLocalTime(num: number): string {
    const instant = Temporal.Instant.fromEpochMilliseconds(num);
    return instant.toString();
}