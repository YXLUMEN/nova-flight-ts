export class AddressUtil {
    public static validateServerAddress(addr: string): boolean {
        const parts = addr.split(":");
        if (parts.length !== 2) return false;

        const [host, portStr] = parts;
        const port = Number(portStr);

        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return false;
        }

        if (host === "localhost") return true;

        const ipv4Regex =
            /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

        return ipv4Regex.test(host);
    }
}