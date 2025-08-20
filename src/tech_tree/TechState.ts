import {deepFreeze, groupBy, isNonEmptyString} from "../utils/uit.ts";
import type {RawTech, Tech, TechAvailable} from "../apis/ITech.ts";

export class TechState {
    public readonly techById: Map<string, Tech>;
    private readonly branchGroups: Map<string, Tech[]>;
    private readonly unlocked = new Set<string>();

    public constructor(techs: Tech[]) {
        this.techById = new Map(techs.map(t => [t.id, t]));
        this.branchGroups = groupBy(techs.filter(t => t.branchGroup), t => t.branchGroup!);
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

    public static normalizeTechs(raw: unknown): Tech[] {
        if (!Array.isArray(raw)) {
            throw new Error('Tech JSON must be an array');
        }
        const out: Map<string, Tech> = new Map();

        raw.forEach((item, idx) => {
            if (item == null || typeof item !== 'object') {
                throw new Error(`Tech[${idx}] must be an object`);
            }

            const r = item as RawTech;

            if (!isNonEmptyString(r.id)) {
                throw new Error(`Tech[${idx}]: "id" is required and must be a non-empty string`);
            }

            const id = r.id.trim();
            if (out.has(id)) {
                throw new Error(`Duplicate tech id: "${id}"`);
            }

            const name = isNonEmptyString(r.name) ? r.name.trim() : id;
            if (typeof r.x !== 'number' || !isFinite(r.x) ||
                typeof r.y !== 'number' || !isFinite(r.y)) {
                throw new Error(`Tech[${idx}]: invalid position (${r.x}, ${r.y})`);
            }

            if (typeof r.cost !== 'number' || !isFinite(r.cost)) {
                throw new Error(`Tech[${idx}]: invalid cost "${r.cost}"`);
            }

            const branchGroup = isNonEmptyString(r.branchGroup) ? r.branchGroup.trim() : undefined;
            const desc = isNonEmptyString(r.desc) ? r.desc.trim() : undefined;

            const requires = Array.isArray(r.requires) ? r.requires : undefined;
            const conflicts = Array.isArray(r.conflicts) ? r.conflicts : undefined;

            out.set(id, {id, name, x: r.x, y: r.y, cost: r.cost, branchGroup, desc, requires, conflicts});
        });

        return deepFreeze(Array.from(out.values()));
    }
}