import type {TranslatableText} from "../../i18n/TranslatableText.ts";
import type {UpgradeDefinition} from "./UpgradeDefinition.ts";
import type {ComponentMap} from "../../component/ComponentMap.ts";

export class Upgrade {
    public readonly description: TranslatableText;
    public readonly definition: UpgradeDefinition;
    public readonly effects: ComponentMap;

    public constructor(description: TranslatableText, definitions: UpgradeDefinition, effects: ComponentMap) {
        this.description = description;
        this.definition = definitions;
        this.effects = effects;
    }

    public toString(): string {
        return `Upgrade ${this.description.toString()}`;
    }
}