import {CommandManager} from "../../command/CommandManager.ts";
import type {ServerCommandSource} from "./ServerCommandSource.ts";
import type {CommandDispatcher} from "../../brigadier/CommandDispatcher.ts";
import {KillCommand} from "../../command/cmd/KillCommand.ts";
import {WorldDifficultCommand} from "../../command/cmd/WorldDifficultCommand.ts";
import {StatusEffectCommand} from "../../command/cmd/StatusEffectCommand.ts";
import {DebugModeCommand} from "../../command/cmd/DebugModeCommand.ts";
import {SummonEntityCommand} from "../../command/cmd/SummonEntityCommand.ts";
import {StageCommand} from "../../command/cmd/StageCommand.ts";
import {KickCommand} from "../../command/cmd/KickCommand.ts";
import {GiveCommand} from "../../command/cmd/GiveCommand.ts";
import {ScoreCommand} from "../../command/cmd/ScoreCommand.ts";
import {DamageCommand} from "../../command/cmd/DamageCommand.ts";
import {TickCommand} from "../../command/cmd/TickCommand.ts";
import {RemoveCommand} from "../../command/cmd/RemoveCommand.ts";
import {TechCommand} from "../../command/cmd/TechCommand.ts";
import {BanCommand} from "../../command/cmd/BanCommand.ts";
import {UnbanCommand} from "../../command/cmd/UnbanCommand.ts";
import {LoginCommand} from "../../command/cmd/LoginCommand.ts";
import {PlayerCommand} from "../../command/cmd/PlayerCommand.ts";

export class ServerCommandManager extends CommandManager {
    public readonly source: ServerCommandSource;

    public constructor(source: ServerCommandSource) {
        super();
        this.source = source;
        this.registry();
    }

    public getDispatcher(): CommandDispatcher<ServerCommandSource> {
        return this.dispatcher;
    }

    public registry(): void {
        // noinspection DuplicatedCode
        KillCommand.registry(this.dispatcher);
        DebugModeCommand.registry(this.dispatcher);
        WorldDifficultCommand.registry(this.dispatcher);
        StatusEffectCommand.registry(this.dispatcher);
        SummonEntityCommand.registry(this.dispatcher);
        StageCommand.registry(this.dispatcher);
        KickCommand.registry(this.dispatcher);
        GiveCommand.registry(this.dispatcher);
        ScoreCommand.registry(this.dispatcher);
        DamageCommand.registry(this.dispatcher);
        TickCommand.registry(this.dispatcher);
        RemoveCommand.registry(this.dispatcher);
        TechCommand.registry(this.dispatcher);
        BanCommand.registry(this.dispatcher);
        UnbanCommand.registry(this.dispatcher);
        LoginCommand.registry(this.dispatcher);
        PlayerCommand.registry(this.dispatcher);
    }
}