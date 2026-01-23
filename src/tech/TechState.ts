import {groupBy, isNonEmptyString} from '../utils/uit.ts';
import type {RawTech, TechAvailable} from '../apis/ITech.ts';
import {Tech} from "./Tech.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {TechLayoutParser} from "../client/tech/TechLayoutParser.ts";
import {isServer} from "../configs/WorldConfig.ts";

export class TechState {
    public readonly allTechs: Tech[];
    public readonly branchGroups: Map<string, Tech[]>;
    public readonly unlocked = new Set<Tech>();
    public readonly dependentsMap: Map<Tech, Set<Tech>>;

    public constructor(techs: Tech[]) {
        this.allTechs = techs;
        this.branchGroups = groupBy(techs.filter(t => t.branchGroup), t => t.branchGroup!);
        this.dependentsMap = this.buildDependentsMap();
    }

    public static normalizeTechs(raw: unknown) {
        if (!Array.isArray(raw)) {
            throw new Error('Tech JSON must be an array');
        }
        const out: Map<string, InstanceType<typeof Tech.Builder>> = new Map();

        let x: number, y: number;
        if (isServer) {
            x = 0;
            y = 0;
        } else {
            const ele = document.getElementById('tech-shell')!;
            ele.classList.remove('hidden');
            const box = document.getElementById('viewport')!.getBoundingClientRect();
            ele.classList.add('hidden');
            x = Math.floor(box.width / 2);
            y = Math.floor(80);
        }

        const parser = new TechLayoutParser(x, y, 160, 80);

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

            const x = rawTech['x'];
            const y = rawTech['y'];
            if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
                throw new Error(`Tech[${idx}]: invalid position (${rawTech.x}, ${rawTech.y})`);
            }

            const cost = rawTech['cost'];
            if (typeof cost !== 'number' || !Number.isFinite(cost)) {
                throw new Error(`Tech[${idx}]: invalid cost '${rawTech.cost}'`);
            }

            const desc = isNonEmptyString(rawTech['desc']) ? rawTech['desc'].trim() : '';

            const drawLine = Array.isArray(rawTech['drawExcept']) ? rawTech['drawExcept'] : null;
            const requires = Array.isArray(rawTech['requires']) ? rawTech['requires'] : null;
            const conflicts = Array.isArray(rawTech['conflicts']) ? rawTech['conflicts'] : null;
            const branchGroup = isNonEmptyString(rawTech['branchGroup']) ? rawTech['branchGroup'].trim() : null;

            const parsedPos = parser.parse(x, y);
            out.set(id, Tech.create()
                .name(name)
                .desc(desc)
                .cost(cost)
                .x(parsedPos.x)
                .y(parsedPos.y)
                .drawExcept(drawLine)
                .requires(requires)
                .conflicts(conflicts)
                .branchGroup(branchGroup)
            );
        });

        return out;
    }

    private buildDependentsMap(): Map<Tech, Set<Tech>> {
        const map = new Map<Tech, Set<Tech>>();

        for (const tech of this.allTechs) {
            map.set(tech, new Set());
        }

        for (const tech of this.allTechs) {
            if (!tech.requires) continue;
            for (const require of tech.requires) {
                map.get(require)?.add(tech);
            }
        }

        return map;
    }

    public collectDescendantsToRevoke(rootTech: Tech): Tech[] {
        const toRevoke = new Set<Tech>();
        const queue: Tech[] = [rootTech];

        while (queue.length > 0) {
            const current = queue.pop()!;
            if (toRevoke.has(current)) continue;

            if (!this.isUnlocked(current)) continue;
            toRevoke.add(current);

            // 继续遍历其 dependents
            const deps = this.dependentsMap.get(current);
            if (!deps) continue;

            for (const dep of deps) {
                if (toRevoke.has(dep)) continue;
                queue.push(dep);
            }
        }

        return toRevoke.values().toArray();
    }

    public computeStatus(tech: Tech): TechAvailable {
        if (this.unlocked.has(tech)) return 'unlocked';
        if (tech.cost < 0) return 'locked';

        // 冲突检测
        if (tech.conflicts && !tech.conflicts.isDisjointFrom(this.unlocked)) {
            return 'conflicted';
        }
        // 分支互斥
        if (tech.branchGroup) {
            const group = this.branchGroups.get(tech.branchGroup);
            if (group) for (const other of group) {
                if (other !== tech && this.unlocked.has(other)) return 'conflicted';
            }
        }

        // 前置检测
        const requires = tech.requires;
        if (!requires) return 'unlockable';

        return requires.values().every(tech => this.unlocked.has(tech)) ? 'unlockable' : 'locked';
    }

    public getTechId(tech: Tech) {
        return Registries.TECH.getId(tech);
    }

    public getTech(id: string) {
        return Registries.TECH.getById(Identifier.tryParse(id));
    }

    public canUnlock(tech: Tech) {
        return this.computeStatus(tech) === 'unlockable';
    }

    public isUnlocked(tech: Tech) {
        return this.unlocked.has(tech);
    }

    public unlock(tech: Tech): boolean {
        if (!this.canUnlock(tech)) return false;
        this.unlocked.add(tech);
        return true;
    }

    public forceUnlock(tech: Tech): void {
        this.unlocked.add(tech);
    }

    public reset(): void {
        this.unlocked.clear();
    }

    public clear(): void {
        this.unlocked.clear();
        this.branchGroups.clear();
    }
}