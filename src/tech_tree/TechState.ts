import {deepFreeze, groupBy, isNonEmptyString} from '../utils/uit.ts';
import type {RawTech, Tech, TechAvailable} from '../apis/ITech.ts';

export class TechState {
    public readonly techById: Map<string, Tech>;
    private readonly branchGroups: Map<string, Tech[]>;
    private readonly unlocked = new Set<string>();

    public constructor(techs: Tech[]) {
        this.techById = new Map(techs.map(t => [t.id, t]));
        this.branchGroups = groupBy(techs.filter(t => t.branchGroup), t => t.branchGroup!);
    }

    public static normalizeTechs(raw: unknown): Tech[] {
        if (!Array.isArray(raw)) {
            throw new Error('Tech JSON must be an array');
        }
        const out: Map<string, Tech> = new Map();

        raw.forEach((item, idx) => {
            if (item == null || typeof item !== 'object') {
                throw new Error(`Tech[${idx}] must be an object`);
            }

            const rawTech = item as RawTech;

            if (!isNonEmptyString(rawTech['id'])) {
                throw new Error(`Tech[${idx}]: 'id' is required and must be a non-empty string`);
            }

            const id = rawTech['id'].trim();
            if (out.has(id)) {
                throw new Error(`Duplicate tech id: '${id}'`);
            }

            const name = isNonEmptyString(rawTech['name']) ? rawTech['name'].trim() : id;
            if (typeof rawTech['x'] !== 'number' || !isFinite(rawTech['x']) ||
                typeof rawTech['y'] !== 'number' || !isFinite(rawTech['y'])) {
                throw new Error(`Tech[${idx}]: invalid position (${rawTech.x}, ${rawTech.y})`);
            }

            if (typeof rawTech['cost'] !== 'number' || !isFinite(rawTech['cost'])) {
                throw new Error(`Tech[${idx}]: invalid cost '${rawTech.cost}'`);
            }

            const branchGroup = isNonEmptyString(rawTech['branchGroup']) ? rawTech['branchGroup'].trim() : undefined;
            const desc = isNonEmptyString(rawTech['desc']) ? rawTech['desc'].trim() : undefined;

            const requires = Array.isArray(rawTech['requires']) ? rawTech['requires'] : undefined;
            const conflicts = Array.isArray(rawTech['conflicts']) ? rawTech['conflicts'] : undefined;

            out.set(id, {
                id,
                name,
                x: rawTech.x,
                y: rawTech.y,
                cost: rawTech['cost'],
                branchGroup,
                desc,
                requires,
                conflicts
            });
        });

        return deepFreeze(Array.from(out.values()));
    }

    public computeStatus(id: string): TechAvailable {
        if (this.unlocked.has(id)) return 'unlocked';
        const t = this.techById.get(id);
        if (t === undefined) return 'locked';
        if (t.cost !== undefined && t.cost < 0) return 'locked';

        // 冲突检测
        if (t.conflicts?.some(cid => this.unlocked.has(cid))) {
            return 'conflicted';
        }
        // 分支互斥
        if (t.branchGroup) {
            for (const other of this.branchGroups.get(t.branchGroup) || []) {
                if (other.id !== id && this.unlocked.has(other.id)) return 'conflicted';
            }
        }
        // 前置检测
        const reqs = t.requires || [];
        return reqs.every(r => this.unlocked.has(r)) ? 'unlockable' : 'locked';
    }

    public canUnlock(id: string) {
        return this.computeStatus(id) === 'unlockable';
    }

    public isUnlocked(id: string) {
        return this.unlocked.has(id);
    }

    public getTech(id: string): Tech | undefined {
        return this.techById.get(id);
    }

    public unlock(id: string): boolean {
        if (!this.canUnlock(id)) return false;
        this.unlocked.add(id);
        return true;
    }

    public forceUnlock(id: string): void {
        this.unlocked.add(id);
    }

    public reset(): void {
        this.unlocked.clear();
    }
}