export interface Comparable {
    equals(other: Comparable): boolean;

    hashCode(): string;
}