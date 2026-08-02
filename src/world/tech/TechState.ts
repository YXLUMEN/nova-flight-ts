import {isNonEmptyString} from '../../utils/uit.ts';
import type {RawTech, TechAvailable} from '../../type/ITech.ts';
import {Tech} from "./Tech.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {TechLayoutParser} from "../../client/tech/TechLayoutParser.ts";
import {isServer} from "../../configs/GlobalConfig.ts";
import {TechBuilder} from "./TechBuilder.ts";
import {ClientTechBuilder} from "../../client/tech/ClientTechBuilder.ts";

export class TechState<T extends Tech = Tech> {
    public readonly allTechs: T[];
    public readonly branchGroups: Map<string, T[]>;
    public readonly unlocked = new Set<T>();
    public readonly dependentsMap: Map<T, Set<T>>;

    public constructor(techs: T[]) {
        this.allTechs = techs;

        const group = Map.groupBy(techs, t => t.branchGroup);
        group.delete(null);
        this.branchGroups = group as Map<string, T[]>;

        this.dependentsMap = this.buildDependentsMap();
    }

    public static normalizeTechs(raw: unknown) {
        if (!Array.isArray(raw)) {
            throw new Error('Tech JSON must be an array');
        }
        const out: Map<string, TechBuilder> = new Map();

        let x: number, y: number;
        if (isServer) {
            x = y = 0;
        } else {
            const ele = document.getElementById('tech-shell')!;
            ele.classList.remove('hidden');
            const box = document.getElementById('viewport')!.getBoundingClientRect();
            ele.classList.add('hidden');
            x = Math.floor(box.width / 2);
            y = Math.floor(80);
        }

        const parser = new TechLayoutParser(x, y, 180, 80);

        raw.forEach((item, index) => {
            if (item == null || typeof item !== 'object') {
                throw new Error(`Tech[${index}] must be an object`);
            }

            const rawTech = item as RawTech;

            if (!isNonEmptyString(rawTech['id'])) {
                throw new Error(`Tech[${index}]: 'id' is required and must be a non-empty string`);
            }

            const id = rawTech['id'].trim();
            if (out.has(id)) {
                throw new Error(`Duplicate tech id: '${id}'`);
            }

            const name = isNonEmptyString(rawTech['name']) ? rawTech['name'].trim() : id;

            const x = rawTech['x'];
            const y = rawTech['y'];
            if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
                throw new Error(`Tech[${index}]: invalid position (${rawTech.x}, ${rawTech.y})`);
            }

            const cost = rawTech['cost'];
            if (typeof cost !== 'number' || !Number.isFinite(cost)) {
                throw new Error(`Tech[${index}]: invalid cost '${rawTech.cost}'`);
            }

            const desc = isNonEmptyString(rawTech['desc']) ? rawTech['desc'].trim() : '';

            const drawLine = Array.isArray(rawTech['drawExcept']) ? rawTech['drawExcept'] : null;
            const requires = Array.isArray(rawTech['requires']) ? rawTech['requires'] : null;
            const conflicts = Array.isArray(rawTech['conflicts']) ? rawTech['conflicts'] : null;
            const branchGroup = isNonEmptyString(rawTech['branchGroup']) ? rawTech['branchGroup'].trim() : null;

            if (isServer) {
                out.set(id, new TechBuilder()
                    .name(name)
                    .cost(cost)
                    .requires(requires)
                    .conflicts(conflicts)
                    .branchGroup(branchGroup));
                return;
            }

            const parsedPos = parser.parse(x, y);
            out.set(id, new ClientTechBuilder()
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

    private buildDependentsMap(): Map<T, Set<T>> {
        const map = new Map<T, Set<T>>();

        for (const tech of this.allTechs) {
            map.set(tech, new Set());
        }

        for (const tech of this.allTechs) {
            if (!tech.requires) continue;
            for (const require of tech.requires) {
                map.get(require as T)?.add(tech);
            }
        }

        return map;
    }

    public collectDescendantsToRevoke(rootTech: T): T[] {
        const toRevoke = new Set<T>();
        const queue: T[] = [rootTech];

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

    public computeStatus(tech: T): TechAvailable {
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

        return requires.values().every(tech => this.unlocked.has(tech as T)) ? 'unlockable' : 'locked';
    }

    public getTechId(tech: T) {
        return Registries.TECH.getId(tech);
    }

    public getTech(id: string): T | null {
        return Registries.TECH.getById(Identifier.tryParse(id)) as T | null;
    }

    public canUnlock(tech: T) {
        return this.computeStatus(tech) === 'unlockable';
    }

    public isUnlocked(tech: T) {
        return this.unlocked.has(tech);
    }

    public unlock(tech: T): boolean {
        if (!this.canUnlock(tech)) return false;
        this.unlocked.add(tech);
        return true;
    }

    public forceUnlock(tech: T): void {
        this.unlocked.add(tech);
    }

    public reset(): void {
        this.unlocked.clear();
    }

    public clear(): void {
        this.allTechs.length = 0;
        this.branchGroups.clear();
        this.unlocked.clear();
        this.dependentsMap.clear();
    }
}