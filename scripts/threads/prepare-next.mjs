import {execFileSync} from 'node:child_process';
const tomorrow=new Date(Date.now()+9*3600000+24*3600000).toISOString().slice(0,10);
for(const slot of ['08','16'])execFileSync(process.execPath,['scripts/threads/drafts.mjs',tomorrow,slot],{stdio:'inherit'});
