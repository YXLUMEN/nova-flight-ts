import {validateIpv4} from "../utils/address_util.ts";
import type {Comparable} from "../type/Comparable.ts";
import {stringHashCode} from "../utils/hash.ts";

export class SocketAddr implements Comparable {
    public static readonly INTEGRATED = new SocketAddr('127.0.0.1', 0);

    public readonly host: string;
    public readonly port: number;

    public constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
    }

    public static from(addr: string) {
        const parts = addr.split(':');
        if (parts.length !== 2) return null;

        const [host, portStr] = parts;
        const port = Number(portStr);

        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return null;
        }

        if (host === 'localhost') return new SocketAddr('127.0.0.1', port);
        return validateIpv4(host) ? new SocketAddr(host, port) : null;
    }

    public toString() {
        return `${this.host}:${this.port}`;
    }

    public hashCode(): number {
        return (31 * stringHashCode(this.host) + this.port) | 0;
    }

    public equals(other: unknown): boolean {
        if (other === this) return true;
        if (other instanceof SocketAddr) {
            return this.host === other.host && this.port === other.port;
        }
        return false;
    }
}