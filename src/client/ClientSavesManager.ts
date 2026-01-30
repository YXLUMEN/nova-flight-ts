import {ServerStorage} from "../server/ServerStorage.ts";
import type {SaveMeta} from "../apis/Saves.ts";
import {error} from "@tauri-apps/plugin-log";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {documentDir, resolve} from "@tauri-apps/api/path";
import {mkdir, readFile, writeFile, writeTextFile} from "@tauri-apps/plugin-fs";
import {NbtSerialization} from "../nbt/NbtSerialization.ts";
import {NbtUnserialization} from "../nbt/NbtUnserialization.ts";
import {confirm, message, open} from "@tauri-apps/plugin-dialog";

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

            if (action === 'import-world') {
                this.importSave();
                return;
            }

            if (this.chosenItem === null) return;

            if (action === 'delete-world') {
                this.deleteWorld();
                return;
            }

            const saveName = this.chosenItem.dataset.saveName;
            if (!saveName) {
                message('未能读取此存档信息, 可能文件已损坏', {kind: 'warning'});
                return;
            }

            if (action === 'load-world') {
                resolve(saveName);
                ctrl.abort();
                return;
            }

            if (action === 'rename') {
                this.renameSave(saveName);
                return;
            }

            if (action === 'export-world') {
                this.exportSave(saveName);
                return;
            }

            if (action === 'export-world-snbt') {
                this.exportAsSNbt(saveName);
                return;
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

        const saves = result.ok().get();
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
            await message('输入不合法, 字符长度必须在 1-120 内, 且不包含 下划线 外的特殊字符');
            return null;
        }

        return await this.tryInsertWorld(input);
    }

    private async tryInsertWorld(input: string) {
        const saveName = await this.genSaveName(input);
        const result = await ServerStorage.insertWorld(saveName);
        if (result.isErr()) {
            const err = result.unwrapErr();
            if (err.name === 'ConstraintError') {
                await message('存在同名存档');
                return null;
            }
            console.error(err);
            await message('创建失败: 数据库异常', {kind: 'error'});
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
            await message('输入不合法, 字符长度必须在 1-120 内, 且不包含 下划线 外的特殊字符');
            return;
        }

        const result = await ServerStorage.db.get<SaveMeta>('save_meta', origin);
        const optional = result.ok();
        if (optional.isEmpty()) {
            await message('未能读取到原始存档');
            return;
        }

        const meta = optional.get();
        meta.display_name = name;
        const isSuccess = await ServerStorage.db.update('save_meta', meta);
        if (isSuccess.isErr()) {
            console.error(isSuccess.unwrapErr());
            await message('修改失败', {kind: 'error'});
        } else {
            await this.refreshSaves();
        }
    }

    private async deleteWorld() {
        if (!this.chosenItem) return;

        const saveName = this.chosenItem.dataset.saveName;
        if (!saveName) {
            if (!await confirm('未能读取次存档信息, 是否强制删除', {
                kind: 'warning',
            })) return;

            this.chosenItem.remove();
            this.deChose();
            return;
        }

        if (!await confirm('确认删除次存档', {
            kind: 'warning',
        })) return;

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
                message('删除时出现错误, 详细信息参考日志');
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
                await message('未找到存档');
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

            await message('已导出至 "文档"');
        } catch (err) {
            await message('导出失败', {kind: 'error'});
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
                await message('未找到存档', {kind: 'warning'});
                return;
            }
            await writeTextFile(worldPath, NbtSerialization.toSNbt(save, true));

            const playerDir = await resolve(saveDir, `players`);
            await mkdir(playerDir, {recursive: true});

            await ServerStorage.loadPlayerInWorld(saveName, (data) => {
                resolve(playerDir, `${data.uuid}.snbt`)
                    .then(path => {
                        const nbt = NbtUnserialization.fromCompactBinary(data.data)
                        writeTextFile(path, NbtSerialization.toSNbt(nbt, true))
                    })
                    .catch(err => console.error(err));
                return true;
            });

            await message('已导出至 "文档"');
        } catch (err) {
            await message('导出失败', {kind: 'error'});
            console.error(err);
        }
    }

    // TODO 完整导入
    private async importSave() {
        const file = await open({
            multiple: false,
            directory: false,
            filters: [{name: 'Archive', extensions: ['dat', 'snbt']}]
        });
        if (!file) return;

        const buffer = await readFile(file);
        if (buffer.length === 0) return;

        if (file.endsWith('.dat')) {
            try {
                const nbt = NbtUnserialization.fromRootCompactBinary(buffer);

                const date = new Date().toISOString();
                const status = nbt === null ? 'broken' : 'normal';

                const worldName = nbt?.getString('WorldName', date) ?? date;
                const saveName = await this.tryInsertWorld(worldName);
                if (!saveName || !nbt) return;

                await ServerStorage.updateWorld(saveName, nbt, status);
                await message('导入完成');
            } catch (err) {
                console.error(err);
                await message('解析失败', {kind: 'error'});
            }
            return;
        }

        if (file.endsWith('.snbt')) {
            try {
                const snbt = new TextDecoder("utf-8", {fatal: true}).decode(buffer);
                const nbt = NbtUnserialization.fromSNbt(snbt);

                const date = new Date().toISOString();
                const worldName = nbt.getString('WorldName', date);
                const saveName = await this.tryInsertWorld(worldName);
                if (!saveName) return;

                await ServerStorage.updateWorld(saveName, nbt);
                await message('导入完成');
                await this.refreshSaves();
            } catch (err) {
                console.error(err);
                await message('解析失败', {kind: 'error'});
            }
        }
    }

    private getInputSaveName(): Promise<string | null> {
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
                    message('输入不能为空', {kind: 'warning'}).then();
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

        const right = document.createElement('div');
        right.className = 'right-box';

        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = save.status === 'normal' ? '' : save.status;

        const timestamp = document.createElement('div');
        timestamp.className = 'time';
        timestamp.textContent = new Date(save.timestamp).toLocaleString();
        right.append(status, timestamp);

        item.append(displayName, saveName, right);
        return item;
    }

    public show() {
        this.saveContainer.classList.remove('hidden');
    }

    public hide() {
        this.saveContainer.classList.add('hidden');
        this.deChose();
    }
}