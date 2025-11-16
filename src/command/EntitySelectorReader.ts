import {StringReader} from "../brigadier/StringReader.ts";
import {SuggestionsBuilder} from "../brigadier/suggestion/SuggestionsBuilder.ts";
import type {EntityFilter} from "./SelectorArguments.ts";
import type {Suggestions} from "../brigadier/suggestion/Suggestions.ts";
import {IllegalArgumentError} from "../apis/errors.ts";
import type {BiConsumer, Consumer} from "../apis/types.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorOptions} from "./EntitySelectorOptions.ts";
import type {IVec} from "../utils/math/IVec.ts";
import type {Entity} from "../entity/Entity.ts";
import {Optional} from "../utils/Optional.ts";
import {Box} from "../utils/math/Box.ts";
import type {EntityType} from "../entity/EntityType.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

type provider = (builder: SuggestionsBuilder, consumer: Consumer<SuggestionsBuilder>) => Promise<Suggestions>;

export class EntitySelectorReader {
    public static DEFAULT_SUGGESTION_PROVIDER: provider = (builder, _) => builder.buildPromise();

    private readonly reader: StringReader;

    private senderOnly: boolean = false;
    private sorter: BiConsumer<IVec, Entity[]> = EntitySelector.ARBITRARY;

    private startCursor: number = 0;
    private limit: number = 1;
    public hasLimit: boolean = false;
    public includesNonPlayers: boolean = false;

    private centerX: number | null = null;
    private centerY: number | null = null;
    private distance: [Optional<number>, Optional<number>] = [Optional.empty(), Optional.empty()];
    private entityType: EntityType<any> | null = null;
    private excludeMode: boolean = false;

    private suggestionProvider: provider = EntitySelectorReader.DEFAULT_SUGGESTION_PROVIDER;

    private filters: EntityFilter[] = [];

    public constructor(reader: StringReader) {
        this.reader = reader;
    }

    public build(): EntitySelector {
        let box: Box | null = null;
        if (this.centerX === null && this.centerY === null) {
            if (this.distance[1].isPresent()) {
                const d = this.distance[1].get();
                box = new Box(-d, -d, d + 1, d + 1);
            }
        } else {
            box = new Box(this.centerX ?? 0, this.centerY ?? 0);
        }

        if (box) this.filters.push(entity => {
            return box.intersectsByBox(entity.calculateBoundingBox());
        });

        if (this.entityType) {
            if (this.excludeMode) {
                this.filters.push(entity => this.entityType !== entity.getType());
            } else {
                this.filters.push(entity => this.entityType === entity.getType());
            }
        }

        return new EntitySelector(
            this.limit ?? Number.MAX_SAFE_INTEGER,
            this.includesNonPlayers,
            this.filters,
            this.sorter,
            this.senderOnly
        );
    }

    protected readRegular(): void {
        if (this.reader.canRead()) {
            this.suggestionProvider = this.suggestNormal;
        }
        this.limit = 1;
    }

    protected readAtVariable(): void {
        this.suggestionProvider = this.suggestSelectorRest;
        if (!this.reader.canRead()) {
            throw new IllegalArgumentError("Can't read variable");
        }

        const start = this.reader.getCursor();
        const c = this.reader.read();

        let result: boolean;
        switch (c) {
            case 'a': {
                this.limit = Number.MAX_SAFE_INTEGER;
                this.includesNonPlayers = false;
                this.sorter = EntitySelector.ARBITRARY;
                this.setEntityType(EntityTypes.PLAYER);
                result = false;
                break;
            }
            case 'e': {
                this.limit = Number.MAX_SAFE_INTEGER;
                this.includesNonPlayers = true;
                this.sorter = EntitySelector.ARBITRARY;
                result = true;
                break;
            }
            case 'n': {
                this.limit = 1;
                this.includesNonPlayers = true;
                this.sorter = EntitySelector.NEAREST;
                result = true;
                break;
            }
            case 'p': {
                this.limit = 1;
                this.includesNonPlayers = false;
                this.sorter = EntitySelector.NEAREST;
                this.setEntityType(EntityTypes.PLAYER);
                result = false;
                break;
            }
            case 'r': {
                this.limit = 1;
                this.includesNonPlayers = false;
                this.sorter = EntitySelector.RANDOM;
                this.setEntityType(EntityTypes.PLAYER);
                result = false;
                break;
            }
            case 's': {
                this.limit = 1;
                this.includesNonPlayers = true;
                this.senderOnly = true;
                result = false;
                break;
            }
            default: {
                this.reader.setCursor(start);
                throw new SyntaxError(`Unknown selector: ${c}`);
            }
        }

        if (result) {
            this.filters.push(entity => entity.isAlive());
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

    public setDistance(distance: [Optional<number>, Optional<number>]) {
        this.distance = distance;
    }

    public getDistance(): Readonly<[Optional<number>, Optional<number>]> {
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