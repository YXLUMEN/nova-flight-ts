import {StringReader} from "../brigadier/StringReader.ts";
import {SuggestionsBuilder} from "../brigadier/suggestion/SuggestionsBuilder.ts";
import type {EntityFilter} from "./SelectorArguments.ts";
import type {Suggestions} from "../brigadier/suggestion/Suggestions.ts";
import {CommandError, IllegalArgumentError} from "../type/errors.ts";
import type {BiConsumer, Consumer, UUID} from "../type/types.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorOptions} from "./EntitySelectorOptions.ts";
import type {IVec} from "../utils/math/IVec.ts";
import type {Entity} from "../entity/Entity.ts";
import {AABB} from "../utils/math/AABB.ts";
import type {EntityType} from "../entity/EntityType.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import type {NumRange} from "../world/predicate/NumberRange.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";
import {squareDistVec2} from "../utils/math/math.ts";
import {shuffleArray} from "../utils/uit.ts";

type provider = (builder: SuggestionsBuilder, consumer: Consumer<SuggestionsBuilder>) => Promise<Suggestions>;

export class EntitySelectorReader {
    public static readonly INVALID_ENTITY_EXCEPTION = new CommandError('Invalid entity');
    public static readonly DEFAULT_SUGGESTION_PROVIDER: provider = (builder, _) => builder.buildPromise();
    public static readonly ARBITRARY: BiConsumer<IVec, Entity[]> = () => {
    };
    public static readonly NEAREST: BiConsumer<IVec, Entity[]> = (pos, entities) => {
        entities.sort((e1, e2) => {
            return squareDistVec2(e1.positionRef, pos) - squareDistVec2(e2.positionRef, pos)
        });
    };
    public static readonly FURTHEST: BiConsumer<IVec, Entity[]> = (pos, entities) => {
        entities.sort((e1, e2) => {
            return squareDistVec2(e2.positionRef, pos) - squareDistVec2(e1.positionRef, pos)
        });
    };
    public static readonly RANDOM: BiConsumer<IVec, Entity[]> = (_, entities) => {
        shuffleArray(entities);
    };

    private readonly reader: StringReader;

    private senderOnly: boolean = false;
    private sorter: BiConsumer<IVec, Entity[]> = EntitySelectorReader.ARBITRARY;

    private startCursor: number = 0;
    private limit: number = 1;
    public hasLimit: boolean = false;
    public includesNonPlayers: boolean = false;

    private playerName: string | null = null;
    private uuid: UUID | null = null;

    private centerX: number | null = null;
    private centerY: number | null = null;
    private distance: NumRange = [null, null];
    private entityType: EntityType<any> | null = null;
    private excludeMode: boolean = false;

    private suggestionProvider: provider = EntitySelectorReader.DEFAULT_SUGGESTION_PROVIDER;
    private filters: EntityFilter[] = [];
    private useAt = false;

    public constructor(reader: StringReader) {
        this.reader = reader;
    }

    public build(): EntitySelector {
        let box: AABB | null = null;
        if (this.centerX === null && this.centerY === null) {
            if (this.distance[1] !== null) {
                const d = this.distance[1];
                box = new AABB(-d, -d, d + 1, d + 1);
            }
        } else {
            box = new AABB(this.centerX ?? 0, this.centerY ?? 0);
        }

        if (this.entityType) {
            if (this.excludeMode) this.filters.push(entity => this.entityType !== entity.getType());
            else this.filters.push(entity => this.entityType === entity.getType());
        }

        return new EntitySelector(
            this.limit ?? Number.MAX_SAFE_INTEGER,
            this.includesNonPlayers,
            this.filters,
            this.distance,
            box,
            this.sorter,
            this.senderOnly,
            this.playerName,
            this.uuid,
            this.useAt
        );
    }

    protected readRegular(): void {
        if (this.reader.canRead()) {
            this.suggestionProvider = this.suggestNormal;
        }

        const start = this.reader.getCursor();
        const str = this.reader.readString();

        if (UUIDUtil.isValidUUID(str)) {
            this.uuid = str;
            this.includesNonPlayers = true;
        } else {
            if (str.length === 0 || str.length > 16) {
                this.reader.setCursor(start);
                throw EntitySelectorReader.INVALID_ENTITY_EXCEPTION;
            }

            this.includesNonPlayers = false;
            this.playerName = str;
        }

        this.limit = 1;
    }

    protected readAtVariable(): void {
        this.useAt = true;
        this.suggestionProvider = this.suggestSelectorRest;
        if (!this.reader.canRead()) {
            throw new IllegalArgumentError("Can't read variable");
        }

        const start = this.reader.getCursor();
        const c = this.reader.read();

        switch (c) {
            case 'a': {
                this.limit = Number.MAX_SAFE_INTEGER;
                this.includesNonPlayers = false;
                this.sorter = EntitySelectorReader.ARBITRARY;
                this.setEntityType(EntityTypes.PLAYER);
                break;
            }
            case 'e': {
                this.limit = Number.MAX_SAFE_INTEGER;
                this.includesNonPlayers = true;
                this.sorter = EntitySelectorReader.ARBITRARY;
                break;
            }
            case 'n': {
                this.limit = 1;
                this.includesNonPlayers = true;
                this.sorter = EntitySelectorReader.NEAREST;
                break;
            }
            case 'p': {
                this.limit = 1;
                this.includesNonPlayers = false;
                this.sorter = EntitySelectorReader.NEAREST;
                this.setEntityType(EntityTypes.PLAYER);
                break;
            }
            case 'r': {
                this.limit = 1;
                this.includesNonPlayers = false;
                this.sorter = EntitySelectorReader.RANDOM;
                this.setEntityType(EntityTypes.PLAYER);
                break;
            }
            case 's': {
                this.limit = 1;
                this.includesNonPlayers = true;
                this.senderOnly = true;
                break;
            }
            default: {
                this.reader.setCursor(start);
                throw new SyntaxError(`Unknown selector: ${c}`);
            }
        }

        this.suggestionProvider = this.suggestOpen;
        if (this.reader.canRead() && this.reader.peek() === '[') {
            this.reader.skip();
            this.suggestionProvider = this.suggestOptionOrEnd;
            this.readArguments();
        }
    }

    protected readArguments(): void {
        this.suggestionProvider = this.suggestOption;
        this.reader.skipWhitespace();

        while (this.reader.canRead() && this.reader.peek() !== ']') {
            this.reader.skipWhitespace();

            const start = this.reader.getCursor();
            const text = this.reader.readString();
            const selectorHandler = EntitySelectorOptions.getHandler(this, text, start);
            this.reader.skipWhitespace();

            if (!this.reader.canRead() || this.reader.peek() !== '=') {
                this.reader.setCursor(start);
                throw new IllegalArgumentError('Empty value');
            }

            this.reader.skip();
            this.reader.skipWhitespace();
            this.suggestionProvider = EntitySelectorReader.DEFAULT_SUGGESTION_PROVIDER;
            selectorHandler(this);

            this.reader.skipWhitespace();
            this.suggestionProvider = this.suggestEndNext;

            if (this.reader.canRead()) {
                if (this.reader.peek() != ',') {
                    if (this.reader.peek() != ']') {
                        throw new SyntaxError('Unterminated');
                    }
                    break;
                }

                this.reader.skip();
                this.suggestionProvider = this.suggestOption;
            }
        }

        if (this.reader.canRead()) {
            this.reader.skip();
            this.suggestionProvider = EntitySelectorReader.DEFAULT_SUGGESTION_PROVIDER;
        } else {
            throw new SyntaxError('Unterminated');
        }
    }

    public read(): EntitySelector {
        this.startCursor = this.reader.getCursor();
        this.suggestionProvider = this.suggestSelector;

        if (this.reader.canRead() && this.reader.peek() === '@') {
            this.reader.skip();
            this.readAtVariable();
        } else {
            this.readRegular();
        }

        return this.build();
    }

    public readNegationCharacter(): boolean {
        this.reader.skipWhitespace();
        if (this.reader.canRead() && this.reader.peek() == '!') {
            this.reader.skip();
            this.reader.skipWhitespace();
            return true;
        }
        return false;
    }

    public readTagCharacter(): boolean {
        this.reader.skipWhitespace();
        if (this.reader.canRead() && this.reader.peek() == '#') {
            this.reader.skip();
            this.reader.skipWhitespace();
            return true;
        }
        return false;
    }

    public listSuggestions(builder: SuggestionsBuilder, consumer: Consumer<SuggestionsBuilder>): Promise<Suggestions> {
        return this.suggestionProvider(builder.createOffset(this.reader.getCursor()), consumer);
    }

    public getReader() {
        return this.reader;
    }

    public setLimit(limit: number) {
        this.limit = limit;
    }

    public isSenderOnly() {
        return this.senderOnly;
    }

    public setDistance(distance: NumRange) {
        this.distance = distance;
    }

    public getDistance(): Readonly<NumRange> {
        return this.distance;
    }

    private static suggestSelector(builder: SuggestionsBuilder) {
        builder.suggestTooltip('@p', 'nearestPlayer');
        builder.suggestTooltip('@a', 'allPlayers');
        builder.suggestTooltip('@r', 'randomPlayer');
        builder.suggestTooltip('@s', 'self');
        builder.suggestTooltip('@e', 'allEntities');
        builder.suggestTooltip('@n', 'nearestEntity');
    }

    private suggestSelector(builder: SuggestionsBuilder, consumer: Consumer<SuggestionsBuilder>): Promise<Suggestions> {
        consumer(builder);
        EntitySelectorReader.suggestSelector(builder);
        return builder.buildPromise();
    }

    private suggestNormal(builder: SuggestionsBuilder, consumer: Consumer<SuggestionsBuilder>): Promise<Suggestions> {
        const suggestionsBuilder = builder.createOffset(this.startCursor);
        consumer(suggestionsBuilder);
        builder.add(suggestionsBuilder);
        return builder.buildPromise();
    }

    private suggestSelectorRest(builder: SuggestionsBuilder): Promise<Suggestions> {
        const suggestionsBuilder = builder.createOffset(builder.start - 1);
        EntitySelectorReader.suggestSelector(builder);
        builder.add(suggestionsBuilder);
        return builder.buildPromise();
    }

    private suggestOpen(builder: SuggestionsBuilder): Promise<Suggestions> {
        builder.suggest('[');
        return builder.buildPromise();
    }

    private suggestOptionOrEnd(builder: SuggestionsBuilder): Promise<Suggestions> {
        builder.suggest(']');
        EntitySelectorOptions.suggestOptions(this, builder);
        return builder.buildPromise();
    }

    private suggestOption(builder: SuggestionsBuilder): Promise<Suggestions> {
        EntitySelectorOptions.suggestOptions(this, builder);
        return builder.buildPromise();
    }

    private suggestEndNext(builder: SuggestionsBuilder): Promise<Suggestions> {
        builder.suggest(',');
        builder.suggest(']');
        return builder.buildPromise();
    }

    public setSuggestionProvider(suggestionProvider: provider) {
        this.suggestionProvider = suggestionProvider;
    }

    public setEntityType(type: EntityType<any>) {
        this.entityType = type;
    }

    public selectsEntityType(): boolean {
        return this.entityType !== null;
    }

    public setExcludesEntityMode() {
        this.excludeMode = true;
    }

    public isExcludesEntityMode() {
        return this.excludeMode;
    }
}