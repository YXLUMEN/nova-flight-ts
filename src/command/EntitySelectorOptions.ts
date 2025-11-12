import type {EntitySelectorReader} from "./EntitySelectorReader.ts";
import type {SuggestionsBuilder} from "../brigadier/suggestion/SuggestionsBuilder.ts";
import type {Consumer, Predicate} from "../apis/types.ts";
import {IllegalArgumentError} from "../apis/errors.ts";
import {NumberRange} from "../predicate/NumberRange.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

interface SelectorOption {
    handler: Consumer<EntitySelectorReader>;
    condition: Predicate<EntitySelectorReader>;
}

export class EntitySelectorOptions {
    private static readonly OPTIONS = new Map<string, SelectorOption>();

    public static putOption(id: string, handler: Consumer<EntitySelectorReader>, condition: Predicate<EntitySelectorReader>) {
        this.OPTIONS.set(id, {handler, condition});
    }

    public static register() {
        if (this.OPTIONS.size > 0) return;

        this.putOption('distance', reader => {
                const start = reader.getReader().getCursor();
                const range = NumberRange.parseNumberRange(reader.getReader(), parseFloat, Number);
                const [min, max] = range;

                if ((min.isEmpty() || min.get() >= 0) &&
                    (max.isEmpty() || max.get() >= 0)
                ) {
                    reader.setDistance(range);
                    return;
                }
                reader.getReader().setCursor(start);
                throw new IllegalArgumentError();
            }, reader => {
                const range = reader.getDistance();
                return range[0].isEmpty() && range[1].isEmpty();
            }
        );

        this.putOption('limit', reader => {
            const start = reader.getReader().getCursor();
            const limit = reader.getReader().readInt();
            if (limit < 1) {
                reader.getReader().setCursor(start);
                throw new IllegalArgumentError('Limit must larger than 1');
            }
            reader.setLimit(limit);
            reader.hasLimit = true;
        }, reader => !reader.isSenderOnly() && !reader.hasLimit);

        this.putOption('type', reader => {
            reader.setSuggestionProvider(async (builder, _) => {
                if (reader.isExcludesEntityType()) {
                    await CommandUtil.suggestIdentifiersPrefix(Registries.ENTITY_TYPE.getIdValues(), builder, '!');
                } else {
                    await CommandUtil.suggestIdentifiers(Registries.ENTITY_TYPE.getIdValues(), builder);
                }

                return builder.buildPromise();
            });

            const start = reader.getReader().getCursor();
            const reserve = reader.readNegationCharacter();

            if (reader.isExcludesEntityType() && !reserve) {
                reader.getReader().setCursor(start);
                throw new IllegalArgumentError('Inapplicable option at "type"');
            }
            if (reserve) {
                reader.setExcludesEntityType();
            }

            const identifier = Identifier.fromCommandInput(reader.getReader());
            const entityType = Registries.ENTITY_TYPE.getById(identifier);
            if (!entityType) {
                reader.getReader().setCursor(start);
                throw new IllegalArgumentError(`Can not find entity with id: ${identifier}`);
            }

            if ((EntityTypes.PLAYER === entityType) && !reserve) {
                reader.includesNonPlayers = false;
            }

            if (!reserve) {
                reader.setEntityType(entityType);
            }
        }, reader => !reader.selectsEntityType());
    }

    public static getHandler(reader: EntitySelectorReader, option: string, restoreCursor: number): Consumer<EntitySelectorReader> {
        const selectorOption = this.OPTIONS.get(option);
        if (!selectorOption) {
            reader.getReader().setCursor(restoreCursor);
            throw new IllegalArgumentError('Unknown option');
        }

        if (selectorOption.condition(reader)) {
            return selectorOption.handler;
        }
        throw new IllegalArgumentError('Inapplicable option');
    }

    public static suggestOptions(reader: EntitySelectorReader, builder: SuggestionsBuilder) {
        const text = builder.remainingLowerCase;

        for (const [key, option] of this.OPTIONS) {
            if (option.condition(reader) && key.toLowerCase().startsWith(text)) {
                builder.suggest(`${key}=`);
            }
        }
    }
}