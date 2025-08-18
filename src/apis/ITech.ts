export interface Tech {
    id: string;
    name: string;
    x: number;
    y: number;
    requires?: string[];
    conflicts?: string[];
    branchGroup?: string;
    cost?: number;
    desc?: string;
}

export type RawTech = Partial<Omit<Tech, 'id' | 'name'>> & { id?: unknown; name?: unknown };

export type TechAvailable = 'unlocked' | 'unlockable' | 'locked' | 'conflicted';