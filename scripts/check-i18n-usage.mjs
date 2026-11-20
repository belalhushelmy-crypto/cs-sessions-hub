#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "/home/khaled/Projects/cs-sessions-hub";
const SRC_DIR = join(ROOT, "src");

function flatten(obj, pre = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const p = pre ? `${pre}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out);
    else out.push(p);
  }
  return out;
}

function findFiles(dir, files = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith(".") && e.name !== "node_modules" && e.name !== ".next") findFiles(f, files);
    } else if (extname(e.name) === ".tsx" || extname(e.name) === ".ts") files.push(f);
  }
  return files;
}

function extract(content) {
  const keys = new Set(), dyn = new Set();
  const ns = new Set();
  for (const m of content.matchAll(/(?:useTranslations|getTranslations)\(['"`](\w+)['"`]\)/g)) ns.add(m[1]);
  if (ns.size === 0) ns.add("common");
  for (const m of content.matchAll(/\bt\(['"`]([^'"`]+)['"`]\)/g)) for (const n of ns) keys.add(`${n}.${m[1]}`);
  for (const m of content.matchAll(/\bt\.(?:rich|raw)\(['"`]([^'"`]+)['"`]\)/g)) for (const n of ns) keys.add(`${n}.${m[1]}`);
  for (const m of content.matchAll(/\btp\(['"`]([^'"`]+)['"`]\)/g)) keys.add(`progress.${m[1]}`);
  for (const m of content.matchAll(/\bt\(([^"'`)]+)\)/g)) { const a = m[1].trim(); if (!a.startsWith('"') && !a.startsWith("'") && !a.startsWith("`")) dyn.add(a); }
  return { keys, dynamicKeys: dyn };
}

const { readFileSync, readdirSync } = require("node:fs");
const { join, extname } = require("node:path");
const ROOT = "/home/khaled/Projects/cs-sessions-hub";
const SRC_DIR = join(ROOT, "src");

function main() {
  const en = JSON.parse(readFileSync(join(ROOT, "messages/en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(ROOT, "messages/ar.json"), "utf8"));

  const enKeys = flatten(en).sort();
  const arKeys = flatten(ar).sort();

  const files = findFiles(SRC_DIR);
  const used = new Set(), dynamic = new Set();

  for (const f of files) {
    const { keys, dynamicKeys } = extract(readFileSync(f, "utf8"));
    for (const k of keys) used.add(k);
    for (const k of dynamicKeys) dynamic.add(k);
  }

  const usedList = [...used].sort();
  const dynList = [...dynamic].sort();

  let missEn = 0, missAr = 0, missing = [];

  console.log("\n=== i18n Key Check ===");
  console.log(`EN: ${enKeys.length} | AR: ${arKeys.length} | Used: ${used.size} | Dyn: ${dynamic.size}\n`);

  for (const k of usedList) {
    const ie = enKeys.includes(k), ia = arKeys.includes(k);
    if (!ie || !ia) {
      console.log(`MISSING: ${k} (EN:${ie?"✓":"✗"} AR:${ia?"✓":"✗"})`);
      if (!ie) missEn++; if (!ia) missAr++; missing.push(k);
    }
  }

  if (dynamic.size) {
    console.log("\n=== Dynamic ===");
    for (const k of [...dynamic].sort()) console.log(`  ${k}`);
  }

  const nsList = ["common","auth","nav","dashboard","profile","admin","assignments","attendance","checkIn","attendanceStatus","submissionStatus","progress","leaderboard","csv","admin.overview","admin.students","admin.sessions","admin.session","admin.assignments","admin.assignment","admin.points","admin.analytics","admin.announcements","admin.similarity","admin.attendance"];
  console.log("\n=== Cross-ns check ===");
  for (const k of missing) {
    const base = k.split(".").slice(1).join(".");
    let fe = false, fa = false, fn = "";
    for (const n of nsList) {
      const f = `${n}.${k.split(".").slice(1).join(".")}`;
      if (enKeys.includes(f)) { fe = true; fn = n; }
      if (arKeys.includes(f)) fa = true;
    }
    if (fe || fa) console.log(`  ${k} -> ${fn}.${k.split(".").slice(1).join(".")} (EN:${fe?"✓":"✗"} AR:${fa?"✓":"✗"})`);
  }

  console.log(`\nMissing EN:${missEn} AR:${missAr} Total:${missEn+missAr}`);
  if (missEn || missAr) process.exit(1);
  else console.log("✓ All static keys present in both locales");
}

function flatten(obj, pre = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const p = pre ? `${pre}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out);
    else out.push(p);
  }
  return out;
}

function findFiles(d, f = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const fu = join(d, e.name);
    if (e.isDirectory()) { if (!e.name.startsWith(".") && e.name !== "node_modules" && e.name !== ".next") findFiles(fu, f); }
    else if (extname(e.name) === ".tsx" || extname(e.name) === ".ts") f.push(fu);
  }
  return f;
}

function extract(c) {
  const keys = new Set(), dyn = new Set();
  const ns = new Set();
  for (const m of c.matchAll(/(?:useTranslations|getTranslations)\(['"`](\w+)['"`]\)/g)) ns.add(m[1]);
  if (ns.size === 0) ns.add("common");
  for (const m of c.matchAll(/\bt\(['"`]([^'"`]+)['"`]\)/g)) for (const n of ns) keys.add(`${n}.${m[1]}`);
  for (const m of c.matchAll(/\bt\.(?:rich|raw)\(['"`]([^'"`]+)['"`]\)/g)) for (const n of ns) keys.add(`${n}.${m[1]}`);
  for (const m of c.matchAll(/\btp\(['"`]([^'"`]+)['"`]\)/g)) keys.add(`progress.${m[1]}`);
  for (const m of c.matchAll(/\bt\(([^"'`)]+)\)/g)) { const a = m[1].trim(); if (!a.startsWith('"') && !a.startsWith("'") && !a.startsWith("`")) dyn.add(a); }
  return { keys, dynamicKeys: dyn };
}

const { readFileSync, readdirSync } = require("node:fs");
const { join, extname } = require("node:path");
const ROOT = "/home/khaled/Projects/cs-sessions-hub";
const SRC_DIR = join(ROOT, "src");

function main() {
  const en = JSON.parse(readFileSync(join(ROOT, "messages/en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(ROOT, "messages/ar.json"), "utf8"));

  const enKeys = flatten(en).sort();
  const arKeys = flatten(ar).sort();

  const files = findFiles(SRC_DIR);
  const used = new Set(), dynamic = new Set();

  for (const f of files) {
    const { keys, dynamicKeys } = extract(readFileSync(f, "utf8"));
    for (const k of keys) used.add(k);
    for (const k of dynamicKeys) dynamic.add(k);
  }

  const usedList = [...used].sort();
  const dynList = [...dynamic].sort();

  let missEn = 0, missAr = 0, missing = [];

  console.log("\n=== i18n Key Check ===");
  console.log(`EN: ${enKeys.length} | AR: ${arKeys.length} | Used: ${used.size} | Dyn: ${dynamic.size}\n`);

  for (const k of usedList) {
    const ie = enKeys.includes(k), ia = arKeys.includes(k);
    if (!ie || !ia) {
      console.log(`MISSING: ${k} (EN:${ie?"✓":"✗"} AR:${ia?"✓":"✗"})`);
      if (!ie) missEn++; if (!ia) missAr++; missing.push(k);
    }
  }

  if (dynamic.size) {
    console.log("\n=== Dynamic ===");
    for (const k of [...dynamic].sort()) console.log(`  ${k}`);
  }

  const nsList = ["common","auth","nav","dashboard","profile","admin","assignments","attendance","checkIn","attendanceStatus","submissionStatus","progress","leaderboard","csv","admin.overview","admin.students","admin.sessions","admin.session","admin.assignments","admin.assignment","admin.points","admin.analytics","admin.announcements","admin.similarity","admin.attendance"];
  console.log("\n=== Cross-ns check ===");
  for (const k of missing) {
    const base = k.split(".").slice(1).join(".");
    let fe = false, fa = false, fn = "";
    for (const n of nsList) {
      const f = `${n}.${k.split(".").slice(1).join(".")}`;
      if (enKeys.includes(f)) { fe = true; fn = n; }
      if (arKeys.includes(f)) fa = true;
    }
    if (fe || fa) console.log(`  ${k} -> ${fn}.${k.split(".").slice(1).join(".")} (EN:${fe?"✓":"✗"} AR:${fa?"✓":"✗"})`);
  }

  console.log(`\nMissing EN:${missEn} AR:${missAr} Total:${missEn+missAr}`);
  if (missEn || missAr) process.exit(1);
  else console.log("✓ All static keys present in both locales");
}

const { readFileSync, readdirSync } = require("node:fs");
const { join, extname } = require("node:path");
const ROOT = "/home/khaled/Projects/cs-sessions-hub";
const SRC_DIR = join(ROOT, "src");
main();