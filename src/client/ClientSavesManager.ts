import {ServerDB} from "../server/ServerDB.ts";
import type {Save} from "../apis/Saves.ts";
import {error} from "@tauri-apps/plugin-log";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {documentDir, resolve} from "@tauri-apps/api/path";
import {mkdir, writeFile} from "@tauri-apps/plugin-fs";

export class ClientSavesManager {
    private readonly saveContainer: HTMLElement;
    private readonly saveList: HTMLElement;
    private readonly buttonBox: HTMLElement;
    private readonly loadWorldBtn: HTMLElement;
    private readonly deleteBtn: HTMLElement;

    private readonly inputContainer: HTMLElement;
    private readonly saveNameInput: HTMLInputElement;
    private readonly inputButtonBox: HTMLElement;

    private chosenItem: HTMLElement | null = null;

    public constructor() {
        this.saveContainer = document.getElementById('start')!;
        this.saveList = document.getElementById('save-list')!;
        this.buttonBox = document.getElementById('start-buttons')!;
        this.loadWorldBtn = document.getElementById('load-world')!;
        this.deleteBtn = document.getElementById('delete-world')!;

        this.inputContainer = document.getElementById('save-name-label')!;
        this.saveNameInput = document.getElementById('save-name-input') as HTMLInputElement;
        this.inputButtonBox = document.getElementById('save-name-buttons')!;
    }

    public async choseSaves() {
        this.show();
        await this.loadAllSaves();

        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();

        this.saveList.addEventListener('click', event => {
            this.deChose();

            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const item = target.closest('.save-list-item');
            if (!item) return;

            this.chosenItem = target;

            target.classList.add('chosen');
            this.loadWorldBtn.classList.remove('disabled');
            this.deleteBtn.classList.remove('disabled');
        }, {signal: ctrl.signal});

        this.saveList.addEventListener('dblclick', event => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const item = target.closest('.save-list-item');
            if (!item) return;

            if (this.chosenItem !== target) return;
            const saveName = this.chosenItem.dataset.saveName;
            if (saveName) {
                resolve(saveName);
                ctrl.abort();
            }
        }, {signal: ctrl.signal});

        this.buttonBox.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const actionBtn = target.closest('.btn');
            if (!actionBtn) return;

            const action = actionBtn.getAttribute('action');
            if (!action) return;

            if (action === 'back') {
                resolve(null);
                ctrl.abort();
                return;
            }

            if (action === 'create-world') {
                this.inputSaveName()
                    .then(input => {
                        if (input === null) return;
                        return this.createNewWorld(input);
                    })
                    .then(async (result) => {
                        if (result === undefined) return;

                        const exist = await ServerDB.db.exist('saves', result);
                        const optional = exist.ok();
                        if (optional.isEmpty() || optional.get()) {
                            alert('无法生成唯一的存档名称');
                            return;
                        }

                        resolve(result);
                        ctrl.abort();
                    })
                    .catch(err => {
                        alert('创建时出现错误');
                        console.error(err);
                        error(String(err));
                    });
                return;
            }

            if (this.chosenItem === null) return;
            if (action === 'load-world') {
                const saveName = this.chosenItem.dataset.saveName;
                if (!saveName) {
                    alert('未能读取此存档信息, 可能文件已损坏');
                    return;
                }

                resolve(saveName);
                ctrl.abort();
                return;
            }

            if (action === 'delete-world') {
                this.deleteChosen();
                return;
            }

            if (action === 'export-world') {
                const saveName = this.chosenItem.dataset.saveName;
                if (!saveName) {
                    alert('未能读取此存档信息, 可能文件已损坏');
                    return;
                }
                this.exportSave(saveName);
            }
        }, {signal: ctrl.signal});

        return promise;
    }

    private async loadAllSaves() {
        const result = await ServerDB.db.getAll<Save>('saves');
        if (result.isErr()) {
            const err = result.unwrapErr();
            const msg = `[Client] Error while read saves, ${err.name}:${err.message} because ${err.cause} at\n ${err.stack}`;

            await error(msg);
            console.error(msg);
            return;
        }

        const optional = result.ok();
        if (optional.isEmpty()) return;

        const saves = optional.get();

        const frag = document.createDocumentFragment();
        for (const save of saves) {
            const item = this.createSaveItem(save);
            frag.append(item);
        }
        this.saveList.replaceChildren(frag);
    }

    private inputSaveName() {
        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();

        this.saveNameInput.value = 'New World';
        this.inputContainer.classList.remove('hidden');
        NovaFlightClient.getInstance().input.setDisabled(true);

        const settled = (result: string | null) => {
            NovaFlightClient.getInstance().input.setDisabled(false);
            this.inputContainer.classList.add('hidden');
            resolve(result);
            ctrl.abort();
        };

        this.inputButtonBox.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const actionBtn = target.closest('.btn');
            if (!actionBtn) return;

            const action = actionBtn.getAttribute('action');
            if (!action) return;
            if (action === 'confirm') {
                const input = this.saveNameInput.value.trim();
                if (input.length === 0) {
                    alert('输入不能为空');
                    return;
                }
                settled(input);
            } else if (action === 'cancel') {
                settled(null);
            }
        }, {signal: ctrl.signal});

        return promise;
    }

    private async createNewWorld(saveName: string) {
        const exist = await ServerDB.db.exist('saves', saveName);
        if (exist.isOk() && !exist.unwrap()) return saveName;

        const db = await ServerDB.db.init();
        const transaction = db.transaction('saves', 'readonly');
        const store = transaction.objectStore('saves');

        const basePattern = new RegExp(`^${saveName}\\((\\d+)\\)$`);

        const range = IDBKeyRange.lowerBound(saveName);
        const request = store.openKeyCursor(range);
        const keys: string[] = [];

        const {promise, resolve, reject} = Promise.withResolvers<string>();

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const key = cursor.key as string;
                if (key.startsWith(saveName) && basePattern.test(key)) {
                    keys.push(key);
                }
                cursor.continue();
                return;
            }

            let maxNum = 0;
            for (const key of keys) {
                const match = key.match(basePattern);
                if (!match) continue;
                if (match[1] === undefined) {
                    maxNum = Math.max(maxNum, 0);
                    continue;
                }

                const num = Number(match[1]);
                if (Number.isNaN(num)) continue;

                maxNum = Math.max(maxNum, num);
            }

            resolve(`${saveName}(${maxNum + 1})`);
        }

        request.onerror = () => {
            console.error('Cursor error:', request.error);
            reject(request.error);
        };

        return promise;
    }

    private async deleteChosen() {
        if (!this.chosenItem) return;

        const saveName = this.chosenItem.dataset.saveName;
        if (!saveName) {
            if (!confirm('未能读取次存档信息, 是否强制删除')) return;

            this.chosenItem.remove();
            this.deChose();
            return;
        }

        if (!confirm('确认删除次存档')) return;

        const result = await ServerDB.deleteWorld(saveName);
        result
            .map(() => {
                this.chosenItem?.remove();
                this.deChose();
            })
            .mapErr(err => {
                const msg = `[Client] Error while deleting save "${saveName}", ${err.name}:${err.message} because ${err.cause} at\n ${err.stack}`;
                console.error(msg);
                error(msg);
                alert('删除时出现错误, 详细信息参考日志');
            });
    }

    private async exportSave(saveName: string) {
        try {
            const documentPath = await documentDir();
            const saveDir = await resolve(documentPath, 'NovaFlight', 'saves', saveName);
            await mkdir(saveDir, {recursive: true});

            const worldPath = await resolve(saveDir, `world.dat`);
            const save = await ServerDB.loadWorld(saveName);

            if (!save) {
                alert('导出失败');
                return;
            }
            await writeFile(worldPath, save.toRootCompactBinary());
            alert('已导出置 "文档"')
        } catch (err) {
            alert('导出失败');
            console.error(err);
        }
    }

    private deChose() {
        this.chosenItem = null;

        this.loadWorldBtn.classList.add('disabled');
        this.deleteBtn.classList.add('disabled');

        this.saveList.querySelectorAll('.save-list-item.chosen')
            .forEach(element => element.classList.remove('chosen'));
    }

    private createSaveItem(save: Save): HTMLDivElement {
        const item = document.createElement('div');
        item.className = 'save-list-item';
        item.dataset.saveName = save.save_name;

        const displayName = document.createElement('div');
        displayName.className = 'display-name';
        displayName.textContent = save.display_name;

        const saveName = document.createElement('div');
        saveName.className = 'save-name';
        saveName.textContent = save.save_name;

        item.append(displayName, saveName);
        return item;
    }

    public show() {
        this.saveContainer.classList.remove('hidden');
    }

    public hide() {
        this.saveContainer.classList.add('hidden');
    }
}