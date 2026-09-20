import type {Supplier} from "../../type/types.ts";

export class BuiltInPath {
    private static readonly PATHS: Map<string, Path2D> = new Map();

    public static get(name: string) {
        const path = this.PATHS.get(name);
        console.assert(path !== undefined);
        return path!;
    }

    public static init() {
        this.PATHS.clear();

        this.create('bracket',
            `M -1 -.58 L -.58 -.58 L -.58 -1 M .58 -1 L .58 -.58 L 1 -.58 
                M 1 .58 L .58 .58 L .58 1 M -.58 1 L -.58 .58 L -1 .58`);
        this.create('hexagon', 'M 0 -1 L .866 -.5 L .866 .5 L 0 1 L -.866 .5 L -.866 -.5 Z');
        this.create('rhombus', 'M1 0.5 L0.2222 1 L0 0.5 L0.2222 0Z');
    }

    private static create(name: string, path: string | Supplier<Path2D>) {
        const resolved = typeof path === 'function' ? path() : new Path2D(path);
        this.PATHS.set(name, resolved);
    }
}