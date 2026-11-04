import type {RecordManager} from "../../database/data/RecordManager.ts";
import type {TagKey} from "../../registry/tag/TagKey.ts";
import {pruneSuffix} from "../../utils/path.ts";
import {RegistryKey} from "../../registry/RegistryKey.ts";
import {RegistryKeys} from "../../registry/RegistryKeys.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {Registries} from "../../registry/Registries.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";
import {RecordTypes} from "../../database/data/RecordTypes.ts";
import {Registry} from "../../registry/Registry.ts";
import {Log} from "../../worker/log.ts";

export class DamageTypes {
    public static readonly GENERIC = this.registry('generic');
    public static readonly KILL = this.registry('kill');
    public static readonly MOB_ATTACK = this.registry('mob_attack');
    public static readonly PLAYER_ATTACK = this.registry('player_attack');
    public static readonly PROJECTILE = this.registry('projectile');
    public static readonly EXPLOSION = this.registry('explosion');
    public static readonly LASER = this.registry('laser');
    public static readonly PLAYER_IMPACT = this.registry('player_impact');
    public static readonly VOID = this.registry('void');
    public static readonly EROSION = this.registry('erosion');
    public static readonly AP_DAMAGE = this.registry('ap_damage');
    public static readonly ARC = this.registry('arc');
    public static readonly KINETIC = this.registry('kinetic');

    public static async init(record: RecordManager) {
        const result = await record.getValue(RecordTypes.TAGS);
        const files = result.unwrap();
        const decoder = new TextDecoder('utf-8', {fatal: true});

        const type2tag: Map<string, TagKey<string>[]> = new Map();
        const tags: Map<string, TagKey<string>> = new Map(
            Object.values(DamageTypeTags)
                .map((v: TagKey<string>) => {
                    return [v.id.getPath(), v];
                }));

        // [tag, [damageType]]
        const newArray = () => [];
        for (const file of files) {
            const tagKey = pruneSuffix(file.name);
            const tag = tags.get(tagKey);
            if (!tag) throw new Error(`Unable to find tag "${tagKey}"`);

            const json = decoder.decode(file.buffer);
            const types: string[] = JSON.parse(json);
            if (!Array.isArray(types)) throw new TypeError('Object is not an array', {cause: types});

            for (const type of types) {
                type2tag.getOrInsertComputed(type, newArray).push(tag);
            }
        }

        for (const entry of Registries.DAMAGE_TYPE.iterEntries()) {
            const id = entry.toString();
            const typeTags = type2tag.get(id);
            if (!typeTags) continue;
            entry.setTags(typeTags);
            type2tag.delete(id);
        }

        if (type2tag.size > 0) {
            Log.warn(`Got unknown tag: ${type2tag.values().toArray()}`);
        }
    }

    private static registry(id: string) {
        const key = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla(id));
        Registry.registerReference(Registries.DAMAGE_TYPE, key, id);
        return key;
    }
}
