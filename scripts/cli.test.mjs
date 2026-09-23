import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VERSION} from './judge.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const cli=join(root,'scripts/judge.mjs');
const example=JSON.parse(readFileSync(join(root,'examples/offline.json'),'utf8'));
const run=(input,args=[])=>spawnSync(process.execPath,[cli,...args],{
 input,encoding:'utf8',timeout:5000,env:{...process.env,TYPESAFE_API_KEY:''}
});

test('offline CLI works outside repository and does not need credentials',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'jev-cli-'));
 try {
  const r=spawnSync(process.execPath,[cli],{cwd,input:JSON.stringify(example),encoding:'utf8',timeout:5000});
  assert.equal(r.status,0);assert.equal(r.stderr,'');
  const output=JSON.parse(r.stdout);assert.equal(output.reason,'private_or_unsanitized');assert.equal(output.typesafe,null);
 } finally {rmSync(cwd,{recursive:true,force:true});}
});
test('help and version work without stdin',()=>{
 assert.match(run('', ['--help']).stdout,/Usage:/);
 const r=run('', ['--version']);assert.equal(r.status,0);assert.equal(r.stdout.trim(),VERSION);
 assert.equal(JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version,VERSION);
});
test('malformed, oversized input and unexpected args exit 2 without reflecting input',()=>{
 for(const [input,args] of [['private-canary',[]],['x'.repeat(24001),[]],[JSON.stringify(example),['--endpoint=private-canary']]]) {
  const r=run(input,args);assert.equal(r.status,2);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('private-canary'));
 }
});
