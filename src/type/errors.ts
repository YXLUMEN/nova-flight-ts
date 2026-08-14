export class IllegalArgumentError extends Error {
}

export class IllegalStateError extends Error {
}

export class CommandError extends Error {
}

export class PacketTooLargeError extends Error {
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