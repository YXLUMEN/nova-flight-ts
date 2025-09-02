import type {Comparable} from "../utils/collection/HashMap.ts";

export class Identifier implements Comparable {
    public static readonly ROOT: Identifier = Identifier.ofVanilla("root");
    public static readonly NAMESPACE_SEPARATOR: string = ':';
    public static readonly DEFAULT_NAMESPACE: string = 'nova-flight';

    private readonly namespace: string;
    private readonly path: string;

    public constructor(namespace: string, path: string) {
        if (!Identifier.isNamespaceValid(namespace)) throw new SyntaxError(`Invalid namespace: ${namespace}`);
        if (!Identifier.isPathValid(path)) throw new SyntaxError(`Invalid path: ${path}`);

        this.namespace = namespace;
        this.path = path;
    }

    public static of(namespace: string, path: string): Identifier {
        return Identifier.ofValidated(namespace, path);
    }

    public static ofVanilla(path: string): Identifier {
        return new Identifier(Identifier.DEFAULT_NAMESPACE, Identifier.validatePath(Identifier.DEFAULT_NAMESPACE, path));
    }

    public static isNamespaceValid(namespace: string): boolean {
        return /^[a-z0-9_.-]+$/.test(namespace);
    }

    public static isPathValid(path: string): boolean {
        return /^[a-z0-9_.\/-]+$/.test(path);
    }

    private static ofValidated(namespace: string, path: string): Identifier {
        return new Identifier(Identifier.validateNamespace(namespace, path), Identifier.validatePath(namespace, path));
    }

    private static validateNamespace(namespace: string, path: string): string {
        if (Identifier.isNamespaceValid(namespace)) {
            return namespace;
        } else {
            throw new SyntaxError(`Non [a-z0-9_.-] character in namespace of location: ${namespace}:${path}`);
        }
    }

    private static validatePath(namespace: string, path: string): string {
        if (Identifier.isPathValid(path)) {
            return path;
        } else {
            throw new SyntaxError("Non [a-z0-9/._-] character in path of location: " + namespace + ":" + path);
        }
    }

    public getPath(): string {
        return this.path;
    }

    public getNamespace(): string {
        return this.namespace;
    }

    public toString(): string {
        return `${this.namespace}:${this.path}`;
    }

    public equals(o: Object): boolean {
        if (this === o) {
            return true;
        } else {
            return !(o instanceof Identifier) ? false : this.namespace === o.namespace && this.path === o.path;
        }
    }

    public hashCode(): string {
        return this.toString();
    }
}