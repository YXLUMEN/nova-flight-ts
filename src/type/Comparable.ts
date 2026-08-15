export interface Comparable {
    equals(other: unknown): boolean;

    // i32
    hashCode(): number;
}