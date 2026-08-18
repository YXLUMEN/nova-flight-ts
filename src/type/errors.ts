export class IllegalArgumentError extends Error {
}

export class IllegalStateError extends Error {
}

export class CommandError extends Error {
}

export class PacketTooLargeError extends RangeError {
    public readonly required: number;
    public readonly limit: number;

    public constructor(required: number, limit: number, options?: ErrorOptions) {
        super(`Packet too large: ${required} bytes exceeds the limit of ${limit} bytes`, options);
        this.name = 'PacketTooLargeError';
        this.required = required;
        this.limit = limit;
    }
}

export class MediaWithoutSrc extends Error {
}

export class DataBaseError extends Error {
}

export class NoResultsError extends Error {
}

export class VersionError extends Error {
}

export class StatusError extends Error {
}

export class NbtSizeValidationException extends Error {
}

export class ConnectionAbort extends Error {
}

export class TimeoutError extends Error {
    public constructor(time?: number) {
        const msg = time ? `Beyond the expected time window: ${time}` : undefined;
        super(msg);
    }
}