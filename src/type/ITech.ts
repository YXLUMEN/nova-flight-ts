import type {ClientTech} from "../client/tech/ClientTech.ts";

export type RawTech = Partial<Omit<ClientTech, 'id' | 'name'>> & {
    id?: unknown;
    name?: unknown;
    x?: unknown;
    y?: unknown
};

export type TechAvailable = 'unlocked' | 'unlockable' | 'locked' | 'conflicted';