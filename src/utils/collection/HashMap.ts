import type {Comparable} from "../../type/Comparable.ts";

/**
 * 实现 `Comparable` 接口元素映射.
 * > 不保证插入顺序
 * */
export interface HashMap<K extends Comparable, V> extends Map<K, V> {
}