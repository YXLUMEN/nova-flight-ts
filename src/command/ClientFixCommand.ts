import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {ClientStorage} from "../client/ClientStorage.ts";

export class ClientFixCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('client_fix')
                .then(
                    literal<T>('statistic')
                        .executes(async () => {
                            const db = await ClientStorage.db.init();
                            const tx = db.transaction('statistics', 'readwrite');
                            const store = tx.objectStore('statistics');
                            store.clear();
                        })
                ));
    }
}