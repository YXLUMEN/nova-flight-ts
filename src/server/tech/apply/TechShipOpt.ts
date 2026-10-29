import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../entity/ServerPlayerEntity.ts";
import {AttributeModifier, Operation} from "../../../component/type/AttributeModifier.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {EntityAttributes} from "../../../entity/attribute/EntityAttributes.ts";

export class TechShipOpt implements ApplyTech {
    private readonly modifier = AttributeModifier.new(
        Identifier.ofVanilla('tech_ship_opt'),
        12,
        Operation.ADD
    );

    public apply(player: ServerPlayerEntity) {
        player.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)
            ?.addModifier(this.modifier);

        if (player.getTags().has('Repaired')) return;
        player.addTag('Repaired');
        player.setHealth(player.getMaxHealth());
    }

    public remove(player: ServerPlayerEntity) {
        player.getAttributeInstance(EntityAttributes.GENERIC_MAX_HEALTH)
            ?.removeModifier(this.modifier);
    }
}
