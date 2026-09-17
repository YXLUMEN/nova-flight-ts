#!/usr/bin/env node
/**
 * 读取或校验版本号, 唯一来源是 src-tauri/tauri.conf.json.
 *
 * 说明:
 *   - Tauri 打包后客户端读到的版本、以及 updater 判断是否需要更新, 都取该配置中的 version;
 *     package.json / Cargo.toml 中的 version 不参与打包, 因此这里不读取.
 *
 * 用法:
 *   node .github/scripts/get-version.mjs                 # 输出当前版本
 *   node .github/scripts/get-version.mjs --verify 0.2.17 # 与期望版本比对, 不一致时退出码 1
 */

import {readFileSync} from 'node:fs';

const TARGET_FILE = 'src-tauri/tauri.conf.json';
const argv = process.argv.slice(2);

let expected = null;

for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--verify') {
        expected = argv[++index];
        continue;
    }
    console.error(`[get-version] 未知参数 ${argv[index]}`);
    process.exit(2);
}

/** 打印错误并中断 */
function fail(message) {
    console.error(`[get-version] 错误: ${message}`);
    process.exit(1);
}

let parsed;
try {
    parsed = JSON.parse(readFileSync(TARGET_FILE, 'utf8'));
} catch (error) {
    fail(`无法读取 ${TARGET_FILE}: ${error.message}`);
}

const version = parsed.version;
if (typeof version !== 'string' || version === '') fail(`${TARGET_FILE} 中缺少顶层 version 字段`);

if (expected !== null && version !== expected) {
    fail(`${TARGET_FILE} 的版本(${version})与期望版本(${expected})不一致`);
}

// 单独一行输出, 便于 shell 取值
process.stdout.write(`${version}\n`);
