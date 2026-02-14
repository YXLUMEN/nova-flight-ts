import {Box} from "../../utils/math/Box.ts";
import type {EntityLike} from "./EntityLike.ts";

export class QuadTree<T extends EntityLike> {
    private readonly boundary: Box;
    private readonly capacity: number;
    private readonly depth: number;
    private readonly maxDepth: number;

    private entities: T[] = [];
    private children: QuadTree<T>[] | null = null; // [NW, NE, SW, SE]

    public constructor(boundary: Box, capacity = 8, depth = 0, maxDepth = 6) {
        this.boundary = boundary;
        this.capacity = capacity;
        this.depth = depth;
        this.maxDepth = maxDepth;
    }

    public insert(entity: T): boolean {
        const bbox = entity.getBoundingBox();
        if (!this.boundary.intersectsByBox(bbox)) {
            return false;
        }

        if (this.children === null) {
            // 尝试直接存储
            if (this.entities.length < this.capacity || this.depth >= this.maxDepth) {
                this.entities.push(entity);
                return true;
            } else {
                // 分裂并重新分配已有实体
                this.subdivide();
                // 重新插入当前所有实体到子节点
                for (const e of this.entities) {
                    this.insertToChildren(e);
                }
                this.entities = []; // 清空叶节点
            }
        }

        return this.insertToChildren(entity);
    }

    private insertToChildren(entity: T): boolean {
        for (const child of this.children!) {
            if (child.insert(entity)) {
                return true;
            }
        }

        this.entities.push(entity);
        return true;
    }

    private subdivide(): void {
        const x = this.boundary.minX;
        const y = this.boundary.minY;
        const hw = this.boundary.getWidth() / 2;
        const hh = this.boundary.getHeight() / 2;
        const cx = x + hw;
        const cy = y + hh;

        const nw = new Box(x, y, cx, cy);
        const ne = new Box(cx, y, x + 2 * hw, cy);
        const sw = new Box(x, cy, cx, y + 2 * hh);
        const se = new Box(cx, cy, x + 2 * hw, y + 2 * hh);

        this.children = [
            new QuadTree(nw, this.capacity, this.depth + 1, this.maxDepth),
            new QuadTree(ne, this.capacity, this.depth + 1, this.maxDepth),
            new QuadTree(sw, this.capacity, this.depth + 1, this.maxDepth),
            new QuadTree(se, this.capacity, this.depth + 1, this.maxDepth),
        ];
    }

    public query(range: Box): T[] {
        const found: T[] = [];

        // 检查是否与当前节点区域相交
        if (!this.boundary.intersectsByBox(range)) {
            return found;
        }

        // 收集当前节点中的实体
        for (const entity of this.entities) {
            if (range.intersectsByBox(entity.getBoundingBox())) {
                found.push(entity);
            }
        }

        // 如果有子节点，递归查询
        if (this.children !== null) {
            for (const child of this.children) {
                found.push(...child.query(range));
            }
        }

        const seen = new Set<number>();
        return found.filter(e => {
            const id = e.getId();
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }

    public clear(): void {
        this.entities = [];
        this.children = null;
    }
}