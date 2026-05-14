import type {Entity} from "./Entity.ts";

export interface Ownable {
    getOwner(): Entity | null;
}