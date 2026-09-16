import type {Supplier} from "../../type/types.ts";
import {PI2} from "../../utils/math/math.ts";

export class BuiltInPath {
    private static readonly PATHS: Map<string, Path2D> = new Map();

    public static get(name: string) {
        return this.PATHS.get(name);
    }

    public static init() {
        this.PATHS.clear();

        this.create('bracket',
            `M -1 -.58 L -.58 -.58 L -.58 -1 M .58 -1 L .58 -.58 L 1 -.58 
                M 1 .58 L .58 .58 L .58 1 M -.58 1 L -.58 .58 L -1 .58`);
        this.create('hexagon', 'M 0 -1 L .866 -.5 L .866 .5 L 0 1 L -.866 .5 L -.866 -.5 Z');
        this.create('circle', () => {
            const circle = new Path2D();
            circle.arc(0, 0, 1, 0, PI2);
            return circle;
        });
    }

    private static create(name: string, path: string | Supplier<Path2D>) {
        const resolved = typeof path === 'function' ? path() : new Path2D(path);
        this.PATHS.set(name, resolved);
    }
}