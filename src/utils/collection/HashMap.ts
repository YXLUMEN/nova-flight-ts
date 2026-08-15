import type {Comparable} from "../../type/Comparable.ts";

export interface HashMap<K extends Comparable, V> extends Map<K, V> {
}