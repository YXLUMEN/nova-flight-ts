import type {Comparable} from "../../type/Comparable.ts";

/**
 * 实现 `Comparable` 接口元素集合.
 * > 不保证插入顺序
 * */
export interface HashSet<T extends Comparable> extends Set<T> {
}