import type {MobFactory, PhaseConfig, SpawnRuleConfig} from "../apis/IStage.ts";
import type {PhaseConfigJSON} from "../apis/registry.ts";
import {spawnBase, spawnBaseS, spawnGun, spawnLineBase} from "../utils/PresetsSpawn.ts";

type FactoryBuilder = (...args: any[]) => MobFactory;

const factoryRegistry = new Map<string, FactoryBuilder>();

export function registerFactory(name: string, builder: FactoryBuilder) {
    factoryRegistry.set(name, builder);
}

export function parsePhasesFromJSON(data: PhaseConfigJSON[]): PhaseConfig[] {
    return data.map(phaseJson => ({
        ...phaseJson,
        rules: phaseJson.rules.map(ruleJson => {
            const [fName, ...fArgs] = ruleJson.factory;
            const builder = factoryRegistry.get(fName);
            if (!builder) throw new Error(`Factory not found: ${fName}`);
            const factoryFn = builder(...fArgs);
            return {
                ...ruleJson,
                factory: factoryFn
            } as SpawnRuleConfig;
        })
    }));
}

registerFactory("spawn-top-random-base-enemy", spawnBase);
registerFactory("spawn-top-random-base-enemy-s", spawnBaseS);
registerFactory("spawn-top-random-base-gun", spawnGun);
registerFactory("spawn-top-random-base-enemy-line", spawnLineBase);