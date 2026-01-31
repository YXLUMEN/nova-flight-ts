import {CommandManager} from "../../command/CommandManager.ts";
import type {ServerCommandSource} from "./ServerCommandSource.ts";
import type {CommandDispatcher} from "../../brigadier/CommandDispatcher.ts";
import {KillCommand} from "../../command/KillCommand.ts";
import {WorldDifficultCommand} from "../../command/WorldDifficultCommand.ts";
import {StatusEffectCommand} from "../../command/StatusEffectCommand.ts";
import {GameModeCommand} from "../../command/GameModeCommand.ts";
import {SummonEntityCommand} from "../../command/SummonEntityCommand.ts";
import {StageCommand} from "../../command/StageCommand.ts";
import {KickCommand} from "../../command/KickCommand.ts";
import {GiveCommand} from "../../command/GiveCommand.ts";
import {ScoreCommand} from "../../command/ScoreCommand.ts";

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
        GameModeCommand.registry(this.dispatcher);
        WorldDifficultCommand.registry(this.dispatcher);
        StatusEffectCommand.registry(this.dispatcher);
        SummonEntityCommand.registry(this.dispatcher);
        StageCommand.registry(this.dispatcher);
        KickCommand.registry(this.dispatcher);
        GiveCommand.registry(this.dispatcher);
        ScoreCommand.registry(this.dispatcher);
    }
}