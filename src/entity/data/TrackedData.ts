export class TrackedData<T> {
    public id: number;
    public dataType: T;

    public constructor(id: number, dataType: T) {
        this.id = id;
        this.dataType = dataType;
    }

    public equals(other: Object): boolean {
        if (this === other) {
            return true;
        }
        if (other instanceof TrackedData) {
            return this.id === other.id;
        }
        return false;
    }
}