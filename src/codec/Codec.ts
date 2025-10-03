import {NbtCompound} from "../nbt/NbtCompound.ts";
import {Identifier} from "../registry/Identifier.ts";
import {AttributeModifiersComponent} from "../component/type/AttributeModifiersComponent.ts";

export interface Codec<T> {
    toNbt(value: T): NbtCompound;

    fromNbt(nbt: NbtCompound): T | null;
}

export class Codecs {
    public static readonly INT: Codec<number> = {
        toNbt(v: number) {
            return new NbtCompound().putInt32("value", v);
        },
        fromNbt(nbt: NbtCompound) {
            return nbt.getInt32("value");
        }
    };

    public static readonly FLOAT: Codec<number> = {
        toNbt(v: number) {
            return new NbtCompound().putFloat("value", v);
        },
        fromNbt(nbt: NbtCompound) {
            return nbt.getFloat("value");
        }
    };

    public static readonly DOABLE: Codec<number> = {
        toNbt(v: number) {
            return new NbtCompound().putDouble("value", v);
        },
        fromNbt(nbt: NbtCompound) {
            return nbt.getDouble("value");
        }
    };

    public static readonly STRING: Codec<string> = {
        toNbt(v: string) {
            return new NbtCompound().putString("value", v);
        },
        fromNbt(nbt: NbtCompound) {
            return nbt.getString("value");
        }
    };

    public static readonly BOOLEAN: Codec<boolean> = {
        toNbt(v: boolean) {
            return new NbtCompound().putBoolean("value", v);
        },
        fromNbt(nbt: NbtCompound) {
            return nbt.getBoolean("value");
        }
    };

    public static readonly NUMER_ARRAY: Codec<number[]> = {
        toNbt(v: number[]) {
            return new NbtCompound().putNumberArray("value", ...v);
        },
        fromNbt(nbt: NbtCompound) {
            return nbt.getNumberArray("value");
        }
    };

    public static readonly STRING_ARRAY: Codec<string[]> = {
        toNbt(value: string[]): NbtCompound {
            return new NbtCompound().putStringArray("value", ...value);
        },
        fromNbt(nbt: NbtCompound): string[] {
            return nbt.getStringArray("value");
        }
    };

    public static readonly ATTRIBUTE_MODIFIERS: Codec<AttributeModifiersComponent> = {
        toNbt(value: { id: Identifier; value: number }): NbtCompound {
            const nbt = new NbtCompound();
            nbt.putString('id', value.id.toString());
            nbt.putDouble('value', value.value);

            return nbt
        },
        fromNbt(nbt: NbtCompound): AttributeModifiersComponent | null {
            const id = Identifier.tryParse(nbt.getString("id"));
            if (!id) return null;

            return new AttributeModifiersComponent(id, nbt.getDouble("value"));
        }
    };
}
