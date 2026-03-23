import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Block} from "./Block.ts";
import {BlockSettings} from "./BlockSettings.ts";

export class Blocks {
    public static readonly AIR = this.register('air', new Block(BlockSettings.create().noCollided().air()));
    public static readonly STONE = this.register('stone',
        new Block(BlockSettings.create().withResistance(6))
    );

    private static register(id: string, block: Block): Block {
        return Registry.registerReferenceById(Registries.BLOCK, Identifier.ofVanilla(id), block).getValue();
    }
}