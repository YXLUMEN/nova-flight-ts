#!/usr/bin/env node
/**
 * 把各平台的单平台清单合并成一份 latest.json.
 *
 * 背景:
 *   Tauri 的 updater 会先完整校验整个 latest.json, 再比较 version 决定是否更新.
 *   因此多平台发布时不能各自写一份清单(会互相覆盖), 必须等所有平台构建完成后统一合并;
 *   只要某个平台条目残缺(缺 url 或 signature), 所有平台的客户端都会更新失败.
 *
 * 用法:
 *   node .github/scripts/merge-latest-json.mjs \
 *     --version 0.2.16 \
 *     --notes-file release-notes.md \
 *     --out latest.json \
 *     manifests/windows-x86_64.json manifests/linux-x86_64.json
 *
 * 可选参数:
 *   --notes <文本>     直接指定更新说明(优先于 --notes-file 与输入文件中的 notes)
 *   --notes-file <文件>
 *   --pub-date <时间>  RFC3339 时间, 缺省为当前 UTC 时间
 */

import {readFileSync, writeFileSync} from 'node:fs';

/** semver(允许预发布/构建后缀) */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/** latest.json 中 platform 键的合法取值形式, 例如 windows-x86_64 / darwin-aarch64 */
const TARGET_PATTERN = /^[a-z0-9]+-[a-z0-9_]+$/;

const options = {inputs: []};
const argv = process.argv.slice(2);

/** 打印错误并中断 */
function fail(message) {
    console.error(`[merge-latest-json] 错误: ${message}`);
    process.exit(1);
}

for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    switch (key) {
        case '--version':
            options.version = argv[++index];
            break;
        case '--notes':
            options.notes = argv[++index];
            break;
        case '--notes-file':
            options.notesFile = argv[++index];
            break;
        case '--out':
            options.out = argv[++index];
            break;
        case '--pub-date':
            options.pubDate = argv[++index];
            break;
        default:
            if (key.startsWith('--')) fail(`未知参数 ${key}`);
            options.inputs.push(key);
    }
}

if (!options.version || !SEMVER_PATTERN.test(options.version)) fail('--version 必须是合法版本号, 例如 0.2.16');
if (!options.out) fail('缺少 --out');
if (options.inputs.length === 0) fail('至少需要一个单平台清单文件作为输入');

if (options.notesFile) {
    try {
        options.notes = readFileSync(options.notesFile, 'utf8').trim();
    } catch (error) {
        fail(`无法读取 ${options.notesFile}: ${error.message}`);
    }
}

const platforms = {};
let firstNotes = '';

for (const input of options.inputs) {
    let manifest;
    try {
        manifest = JSON.parse(readFileSync(input, 'utf8'));
    } catch (error) {
        fail(`无法读取 ${input}: ${error.message}`);
    }

    if (manifest.version !== options.version) {
        fail(`${input} 的 version(${manifest.version})与目标版本(${options.version})不一致`);
    }
    if (!firstNotes) firstNotes = manifest.notes ?? '';
    if (!manifest.platforms || Object.keys(manifest.platforms).length === 0) {
        fail(`${input} 中没有 platforms 条目`);
    }

    for (const [target, entry] of Object.entries(manifest.platforms)) {
        if (!TARGET_PATTERN.test(target)) fail(`${input} 中的平台键非法: ${target}`);
        if (platforms[target]) fail(`平台 ${target} 在多个清单文件中重复出现`);
        if (!entry?.signature) fail(`${input} 的 ${target} 缺少 signature`);
        if (!/^https:\/\/\S+$/.test(entry.url ?? '')) fail(`${input} 的 ${target} 的 url 必须是 https 链接`);
        platforms[target] = {signature: entry.signature, url: entry.url};
    }
}

const manifest = {
    version: options.version,
    notes: options.notes ?? firstNotes,
    // Tauri 期望 RFC3339, 去掉毫秒以获得更干净的时间戳
    pub_date: options.pubDate ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    platforms,
};

writeFileSync(options.out, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[merge-latest-json] 已生成 ${options.out} (version=${manifest.version}, platforms=${Object.keys(platforms).join(', ')})`);
