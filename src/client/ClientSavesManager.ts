import {ServerStorage} from "../server/ServerStorage.ts";
import type {SaveMeta} from "../apis/Saves.ts";
import {error, warn} from "@tauri-apps/plugin-log";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {documentDir, resolve} from "@tauri-apps/api/path";
import {exists, mkdir, readFile, readTextFile, writeFile, writeTextFile} from "@tauri-apps/plugin-fs";
import {NbtSerialization} from "../nbt/NbtSerialization.ts";
import {NbtUnserialization} from "../nbt/NbtUnserialization.ts";
import {confirm, message} from "@tauri-apps/plugin-dialog";
import {invoke} from "@tauri-apps/api/core";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import {UUIDUtil} from "../utils/UUIDUtil.ts";
import {BinaryWriter} from "../nbt/BinaryWriter.ts";

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
        await ServerStorage.updateStatus();
        await this.refreshSaveDisplay();

        this.show();

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

    private async refreshSaveDisplay(): Promise<void> {
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
        if (!saveName || saveName instanceof Error) {
            return null
        }

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
        const exist = await ServerStorage.db.exist('save_meta', saveName);
        if (exist.isOk() && !exist.unwrap()) return saveName;

        const db = await ServerStorage.db.init();
        const transaction = db.transaction('save_meta', 'readonly');
        const store = transaction.objectStore('save_meta');

        const basePattern = new RegExp(`^${saveName}\\((\\d+)\\)$`);

        const range = IDBKeyRange.lowerBound(saveName);
        const request = store.openKeyCursor(range);
        const keys: string[] = [];

        const {promise, resolve} = Promise.withResolvers<string | Error | null>();

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
            resolve(request.error);
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
            await this.refreshSaveDisplay();
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
            const result = await ServerStorage.loadWorld(saveName);
            if (result.isErr()) {
                const msg = result.unwrapErr().message || '未找到存档';
                await message(msg, {kind: 'warning'});
                return;
            }
            await writeFile(worldPath, NbtSerialization.toRootCompactBinary(result.ok().get()));

            const playerDir = await resolve(saveDir, `players`);
            await mkdir(playerDir, {recursive: true});

            // 添加头部
            const writer = new BinaryWriter();
            writer.writeInt32(NbtCompound.MAGIC);
            writer.writeInt16(NbtCompound.VERSION);
            const header = writer.toUint8Array();

            await ServerStorage.loadPlayerInWorld(saveName, async (data) => {
                try {
                    const path = await resolve(playerDir, `${data.uuid}.dat`);
                    await writeFile(path, header);
                    return await writeFile(path, data.data, {append: true});
                } catch (err) {
                    return console.error(err);
                }
            });

            await message('已导出至 "Document/NovaFlight"');
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
            const result = await ServerStorage.loadWorld(saveName);
            if (result.isErr()) {
                const msg = result.unwrapErr().message || '未找到存档';
                await message(msg, {kind: 'warning'});
                return;
            }
            await writeTextFile(worldPath, NbtSerialization.toSNbt(result.ok().get(), true));

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

    private async importSave() {
        let results: ChosenDirResult | undefined;
        try {
            results = await invoke('chose_dir');
        } catch (err) {
            console.error(err);
            await message('未能读取目录', {kind: 'error'});
        }
        if (!results || results.root.length === 0 || results.files.length === 0) return;

        const root = results.root;
        const rootName = root.split(/[\\/]/).pop();
        if (!rootName) return;

        const saveName = await this.tryInsertWorld(rootName);
        if (!saveName) return;

        const alreadyImport = new Set<string>();
        const failTasks: { path: string, reason: string }[] = [];

        const parseNbt = async (fullPath: string, path: string, fileName: string, ext: string) => {
            try {
                if (!await exists(fullPath)) {
                    failTasks.push({path, reason: 'not exists'});
                    return null;
                }

                let compound: NbtCompound | null;
                if (ext === 'dat') {
                    compound = NbtUnserialization.fromRootCompactBinary(await readFile(fullPath));
                } else {
                    compound = NbtUnserialization.fromSNbt(await readTextFile(fullPath));
                }
                if (compound === null) failTasks.push({path, reason: 'parse fail'});
                else alreadyImport.add(fileName);

                return compound;
            } catch (err) {
                if (typeof err === 'string' && err.startsWith('forbidden path')) {
                    failTasks.push({path, reason: 'forbidden'});
                } else {
                    failTasks.push({path, reason: 'parse error'});
                }
                console.error(err);
                return null;
            }
        };

        for (const fullPath of results.files) {
            const path = fullPath.split(/[\\/]/).pop();
            if (!path) continue;

            const i = path.lastIndexOf('.');
            if (i <= 0) continue;

            const ext = path.substring(i + 1);
            if (ext !== 'dat' && ext !== 'snbt') continue;

            const fileName = path.substring(0, i);
            if (alreadyImport.has(fileName)) continue;

            if (fileName === 'world') {
                const compound = await parseNbt(fullPath, path, fileName, ext);
                if (compound === null) break;

                const saveResult = await ServerStorage.updateWorld(saveName, compound);
                if (saveResult.isErr()) {
                    failTasks.push({path, reason: saveResult.unwrapErr().message});
                    console.error(saveResult.unwrapErr());
                }
                continue;
            }

            if (fullPath.lastIndexOf('players') > 0 && UUIDUtil.isValidUUID(fileName)) {
                const compound = await parseNbt(fullPath, path, fileName, ext);
                if (compound === null) continue;

                const playerResult = await ServerStorage.savePlayerNbt(saveName, fileName, compound);
                if (playerResult.isErr()) {
                    failTasks.push({path, reason: playerResult.unwrapErr().message});
                    console.error(playerResult.unwrapErr());
                }
            }
        }

        if (failTasks.length === 0) {
            await message('导入完成');
            await this.refreshSaveDisplay();
            return
        }

        if (failTasks.find(fail => fail.reason === 'forbidden')) {
            await message('读取时被拒绝, 尝试将存档文件夹转移至 "Document/NovaFlight" 再进行导入', {kind: 'warning'});
        } else {
            await message(`导入完成, 但存在 ${failTasks.length} 个文件无法加载`, {kind: 'warning'});
        }
        await warn(`导入时无法加载: ${JSON.stringify(failTasks)}`);
        await this.refreshSaveDisplay();
    }

    private getInputSaveName(): Promise<string | null> {
        const {promise, resolve} = Promise.withResolvers<string | null>();
        const ctrl = new AbortController();

        this.saveNameInput.value = 'New World';
        this.inputContainer.classList.remove('hidden');
        NovaFlightClient.getInstance().input.startInput(true);

        const settled = (result: string | null) => {
            NovaFlightClient.getInstance().input.startInput(false);
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
        status.classList.add('status', save.status);
        status.textContent = save.status === 'available' ? '' : save.status;

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

type ChosenDirResult = {
    root: string;
    files: string[];
}