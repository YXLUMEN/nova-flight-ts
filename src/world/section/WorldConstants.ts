export class WorldConstants {
    public static readonly BLOCK_SIZE = 8;
    public static readonly BLOCK_SIZE_LOG2 = 3;
    public static readonly SECTION_SIZE = 16;
    public static readonly SECTION_SIZE_LOG2 = 4;
    public static readonly SECTION_MASK = 0xF;
    public static readonly SECTION_BLOCK_COUNT = WorldConstants.SECTION_SIZE * WorldConstants.SECTION_SIZE;
}