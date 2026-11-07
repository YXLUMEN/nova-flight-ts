import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {writeTextFile} from "@tauri-apps/plugin-fs";
import {resolveResource} from "@tauri-apps/api/path";
import {confirm} from "@tauri-apps/plugin-dialog";
import {literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {ClientStorage} from "../client/storage/ClientStorage.ts";

export class ClientFixCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('client_fix')
                .then(
                    literal<T>('statistic')
                        .executes(async ctx => {
                            try {
                                const backup = await ClientStorage.db.getAll('statistics');
                                if (backup.isOk()) {
                                    const path = await resolveResource('statistic.backup.json');
                                    await writeTextFile(path, JSON.stringify(backup.unwrap()));
                                } else {
                                    if (!await confirm(
                                        'Can not backup statistic, this action will remove all records',
                                        {
                                            title: 'Fix statistic',
                                            kind: 'warning',
                                        },
                                    )) return;
                                }

                                await ClientStorage.db.clearStore('statistics');
                                ctx.source.addMessage('Records cleared');
                            } catch (err) {
                                console.error(err);
                                ctx.source.addMessage('Fail to fix statistic');
                            }
                        })
                )
        );
    }
}