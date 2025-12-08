import type {Tech} from "../tech/Tech.ts";

export type RawTech = Partial<Omit<Tech, 'id' | 'name'>> & { id?: unknown; name?: unknown; x?: unknown; y?: unknown };

export type TechAvailable = 'unlocked' | 'unlockable' | 'locked' | 'conflicted';