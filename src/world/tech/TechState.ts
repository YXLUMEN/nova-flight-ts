import type {TechAvailable} from '../../type/ITech.ts';
import {Tech} from "./Tech.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";

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

    public successorsClosure(root: T): T[] | null {
        const origin = this.dependentsMap.get(root);
        if (!origin) return null;

        const out: T[] = [];
        const seen = new Set<T>();
        const stack = [...origin];
        while (stack.length > 0) {
            const tech = stack.pop()!;
            if (seen.has(tech)) continue;
            seen.add(tech);
            out.push(tech);

            const g = this.dependentsMap.get(tech);
            if (g) stack.push(...g);
        }
        return out;
    }

    public branchPeers(tech: T): IteratorObject<T> | null {
        const group = tech.branchGroup;
        if (!group) return null;

        const stack = this.branchGroups.get(group);
        return stack == null ? null : stack.values().filter(t => t !== tech);
    }

    public conflictPeers(tech: T): IteratorObject<T> | null {
        return tech.conflicts === null ? null : tech.conflicts.values() as SetIterator<T>;
    }

    public affectedByUnlock(tech: T): Set<T> {
        const affected = new Set<T>();
        const addClosure = (root: T) => {
            affected.add(root);
            const closure = this.successorsClosure(root);
            if (!closure) return;
            for (const t of closure) affected.add(t);
        };
        addClosure(tech);
        this.branchPeers(tech)?.forEach(addClosure);
        this.conflictPeers(tech)?.forEach(addClosure);
        return affected;
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

    public getUnlocked() {
        return this.unlocked.values();
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