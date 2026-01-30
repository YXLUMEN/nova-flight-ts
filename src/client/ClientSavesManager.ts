import {ServerStorage} from "../server/ServerStorage.ts";
import type {SaveMeta} from "../apis/Saves.ts";
import {error} from "@tauri-apps/plugin-log";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {documentDir, resolve} from "@tauri-apps/api/path";
import {mkdir, writeFile, writeTextFile} from "@tauri-apps/plugin-fs";
import {NbtSerialization} from "../nbt/NbtSerialization.ts";
import {NbtUnserialization} from "../nbt/NbtUnserialization.ts";

export class ClientSavesManager {
    private readonly saveContainer: HTMLElement;
    private readonly saveList: HTMLElement;
    private readonly buttonBox: HTMLElement;

    private readonly inputContainer: HTMLElement;
    private readonly saveNameInput: HTMLInputElement;
    private readonly inputButtonBox: HTMLElement;

    private chosenItem: HTMLElement | null = null;

    public constructor() {
        this.saveContainer = document.getElementById('start')!;
        this.saveList = document.getElementById('save-list')!;
        this.buttonBox = document.getElementById('start-buttons')!;

        this.inputContainer = document.getElementById('save-name-label')!;
        this.saveNameInput = document.getElementById('save-name-input') as HTMLInputElement;
        this.inputButtonBox = document.getElementById('save-name-buttons')!;
    }

    public async choseSaves() {
        this.show();
        await this.refreshSaves();

        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();

        this.saveList.addEventListener('click', event => {
            this.deChose();

            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const item = target.closest('.save-list-item');
            if (!item) return;

            this.chosenItem = target;
            this.onChose();
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
                this.createNewWorld().then(result => {
                    if (result === null) return;
                    resolve(result);
                    ctrl.abort();
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

            if (action === 'rename') {
                const saveName = this.chosenItem.dataset.saveName;
                if (!saveName) {
                    alert('未能读取此存档信息, 可能文件已损坏');
                    return;
                }
                this.renameSave(saveName);
                return;
            }

            if (action === 'delete-world') {
                this.deleteWorld();
                return;
            }

            if (action === 'export-world') {
                const saveName = this.chosenItem.dataset.saveName;
                if (!saveName) {
                    alert('未能读取此存档信息, 可能文件已损坏');
                    return;
                }
                this.exportSave(saveName);
                return;
            }

            if (action === 'export-world-snbt') {
                const saveName = this.chosenItem.dataset.saveName;
                if (!saveName) {
                    alert('未能读取此存档信息, 可能文件已损坏');
                    return;
                }
                this.exportAsSNbt(saveName);
            }
        }, {signal: ctrl.signal});

        return promise;
    }

    private async refreshSaves() {
        const result = await ServerStorage.db.getAll<SaveMeta>('save_meta');
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
        if (saves.length === 0) return;

        const frag = document.createDocumentFragment();
        for (const save of saves) {
            const item = this.createSaveItem(save);
            frag.append(item);
        }
        this.saveList.replaceChildren(frag);
    }

    private async createNewWorld() {
        const input = await this.getInputSaveName();
        if (!input) return null;

        if (ClientSavesManager.isinValidName(input)) {
            alert('输入不合法, 字符长度必须在 1-120 内, 且不包含 下划线 外的特殊字符');
            return null;
        }

        const saveName = await this.genSaveName(input);
        const result = await ServerStorage.insertWorld(saveName);
        if (result.isErr()) {
            const err = result.unwrapErr();
            if (err.name === 'ConstraintError') {
                alert('存在同名存档');
                return null;
            }
            console.error(err);
            alert('创建失败: 数据库异常');
            return null;
        }

        return saveName;
    }

    private static isinValidName(name: string) {
        if (!name || name.length === 0 || name.length > 120) return true;
        if (/[@#$%^&!<>:"/\\|?*\x00]/.test(name)) return true;
        const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
        return reserved.includes(name.toUpperCase());
    }

    private async genSaveName(saveName: string) {
        const exist = await ServerStorage.db.exist('saves', saveName);
        if (exist.isOk() && !exist.unwrap()) return saveName;

        const db = await ServerStorage.db.init();
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

    private async renameSave(origin: string) {
        const name = await this.getInputSaveName();
        if (!name) return;

        if (ClientSavesManager.isinValidName(name)) {
            alert('输入不合法, 字符长度必须在 1-120 内, 且不包含 下划线 外的特殊字符');
            return;
        }

        const result = await ServerStorage.db.get<SaveMeta>('save_meta', origin);
        const optional = result.ok();
        if (optional.isEmpty()) {
            alert('未能读取到原始存档');
            return;
        }

        const meta = optional.get();
        meta.display_name = name;
        const isSuccess = await ServerStorage.db.update('save_meta', meta);
        if (isSuccess.isErr()) {
            alert('修改失败');
        } else {
            alert('重命名成功');
            await this.refreshSaves();
        }
    }

    private async deleteWorld() {
        if (!this.chosenItem) return;

        const saveName = this.chosenItem.dataset.saveName;
        if (!saveName) {
            if (!confirm('未能读取次存档信息, 是否强制删除')) return;

            this.chosenItem.remove();
            this.deChose();
            return;
        }

        if (!confirm('确认删除次存档')) return;

        const result = await ServerStorage.deleteWorld(saveName);
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
            const save = await ServerStorage.loadWorld(saveName);
            if (!save) {
                alert('未找到存档');
                return;
            }
            await writeFile(worldPath, NbtSerialization.toRootCompactBinary(save));

            const playerDir = await resolve(saveDir, `players`);
            await mkdir(playerDir, {recursive: true});

            await ServerStorage.loadPlayerInWorld(saveName, (data) => {
                resolve(playerDir, `${data.uuid}.dat`)
                    .then(path => writeFile(path, new Uint8Array(data.data)))
                    .catch(err => console.error(err));
                return true;
            });

            alert('已导出至 "文档"');
        } catch (err) {
            alert('导出失败');
            console.error(err);
        }
    }

    private async exportAsSNbt(saveName: string) {
        try {
            const documentPath = await documentDir();
            const saveDir = await resolve(documentPath, 'NovaFlight', 'saves', saveName);
            await mkdir(saveDir, {recursive: true});

            const worldPath = await resolve(saveDir, `world.snbt`);
            const save = await ServerStorage.loadWorld(saveName);
            if (!save) {
                alert('未找到存档');
                return;
            }
            await writeTextFile(worldPath, NbtSerialization.toSnbt(save, true));

            const playerDir = await resolve(saveDir, `players`);
            await mkdir(playerDir, {recursive: true});

            await ServerStorage.loadPlayerInWorld(saveName, (data) => {
                resolve(playerDir, `${data.uuid}.snbt`)
                    .then(path => {
                        const nbt = NbtUnserialization.fromCompactBinary(data.data)
                        writeTextFile(path, NbtSerialization.toSnbt(nbt, true))
                    })
                    .catch(err => console.error(err));
                return true;
            });

            alert('已导出至 "文档"');
        } catch (err) {
            alert('导出失败');
            console.error(err);
        }
    }

    private getInputSaveName() {
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

    private onChose() {
        this.chosenItem?.classList.add('chosen');
        for (const element of this.buttonBox.children) {
            if (element.classList.contains('always')) continue;
            element.classList.remove('disabled');
        }
    }

    private deChose() {
        this.chosenItem = null;

        this.saveList.querySelectorAll('.save-list-item.chosen')
            .forEach(element => element.classList.remove('chosen'));

        for (const element of this.buttonBox.children) {
            if (element.classList.contains('always')) continue;
            element.classList.add('disabled');
        }
    }

    private createSaveItem(save: SaveMeta): HTMLDivElement {
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