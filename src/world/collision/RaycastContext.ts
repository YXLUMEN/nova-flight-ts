import type {BitBlockMap} from "../section/BitBlockMap.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

export interface RaycastContext {
    start: Vec2;
    end: Vec2;
    map: BitBlockMap;
}