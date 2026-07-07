import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Block} from "./Block.ts";
import {BlockProperties} from "./state/BlockProperties.ts";
import {AirBlock} from "./AirBlock.ts";

export class Blocks {
    public static readonly AIR = this.register('air', new AirBlock(BlockProperties.create().noCollision().air()));
    public static readonly STONE = this.register('stone',
        new Block(BlockProperties.create().setResistance(6).setColor('#808080'))
    );
    public static readonly SOIL = this.register('soil',
        new Block(BlockProperties.create().setResistance(1).setColor('#573a32'))
    );
    public static readonly GRASS = this.register('grass',
        new Block(BlockProperties.create().setResistance(1).setColor('#188c00'))
    );
    public static readonly BEDROCK = this.register('bedrock',
        new Block(BlockProperties.create().strength(Infinity, Infinity).setColor('#3c3c3c'))
    );

    private static register(id: string, block: Block): Block {
        return Registry.registerReferenceById(Registries.BLOCK, Identifier.ofVanilla(id), block).getValue();
    }

    static {
        for (const block of Registries.BLOCK) {
            for (const state of block.getStateDefinition().getPossibleStates()) {
                Block.BLOCK_STATE_REGISTRY.add(state);
                state.initCache();
            }
        }
    }
}