import type {Entity} from "./Entity.ts";

export interface IOwnable {
    getOwner(): Entity;
}