import type {ApplyTech} from "../ApplyTech.ts";
import {type ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {AttributeModifier, Operation} from "../../../component/type/AttributeModifier.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {EntityAttributes} from "../../../entity/attribute/EntityAttributes.ts";

export class TechDeflector implements ApplyTech {
    private readonly modifier = AttributeModifier.new(
        Identifier.ofVanilla('tech_deflector'),
        20,
        Operation.ADD
    );

    public apply(player: ServerPlayerEntity) {
        player.getAttributeInstance(EntityAttributes.GENERIC_MAX_SHIELD)
            ?.addModifier(this.modifier);
    }

    public remove(player: ServerPlayerEntity) {
        player.getAttributeInstance(EntityAttributes.GENERIC_MAX_SHIELD)
            ?.removeModifier(this.modifier);
    }
}