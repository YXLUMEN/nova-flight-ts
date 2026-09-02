import {BlockBehaviour} from "./state/BlockBehaviour.ts";
import {BlockState} from "./state/BlockState.ts";
import {BlockProperties} from "./state/BlockProperties.ts";
import {StateDefinition, type StateDefinitionBuilder} from "./state/StateDefinition.ts";

export class Block extends BlockBehaviour {
    protected readonly stateDefinition: StateDefinition<Block, BlockState>;
    private defaultBlockState: BlockState | null = null;

    public constructor(properties: BlockProperties) {
        super(properties);

        const builder = StateDefinition.builder<Block, BlockState>(this);
        this.createBlockStateDefinition(builder);
        this.stateDefinition = builder.create(() => this.defaultState(), BlockState);
        this.registerDefaultState(this.stateDefinition.any());
    }

    protected createBlockStateDefinition(_builder: StateDefinitionBuilder<Block, BlockState>) {
    }

    protected registerDefaultState(state: BlockState): void {
        this.defaultBlockState = state;
    }

    public defaultState(): BlockState {
        return this.defaultBlockState!;
    }

    public getStateDefinition(): StateDefinition<Block, BlockState> {
        return this.stateDefinition;
    }
}