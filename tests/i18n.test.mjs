import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {locales,messages,translate,localizeTask} from '../dist/i18n.mjs';
import {analyzeReadme,priorities} from '../dist/review.mjs';
test('every message has three translations and consistent interpolation',()=>{
 for(const [key,values]of Object.entries(messages)){
  assert.equal(values.length,3,key);assert.ok(values.every(value=>typeof value==='string'&&value.trim()),key);
  const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(tokens(values[0]),tokens(values[1]),key);assert.deepEqual(tokens(values[0]),tokens(values[2]),key);
 }
 assert.equal(translate('profileTitle','en',{user:'octocat'}),'The portfolio of @octocat');
});
test('all static and literal runtime message keys exist',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 for(const m of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g))assert.ok(messages[m[1]],m[1]);
 for(const m of app.matchAll(/(?:\bt|setStatus|ApiError)\('([^']+)'/g))assert.ok(messages[m[1]],m[1]);
});
test('Spanish headings are recognized independently of interface language',()=>{
 assert.ok(analyzeReadme('## Acerca del proyecto\n## Instalación\n## Cómo usar\n## Tecnologías\n## Ejemplos').every(s=>s.found));
});
test('every priority path is translatable, including unavailable content',()=>{
 const samples=[null,false,true].map(readme=>({readme,readmeReview:null}));
 samples.push({readme:true,readmeReview:analyzeReadme('')});
 for(const repo of samples)for(const lang of locales)for(const task of priorities(repo)){
  const localized=localizeTask(task,lang);assert.ok(localized.title&&localized.reason&&localized.action);
 }
});
function luminance(hex){const channels=hex.match(/[a-f0-9]{2}/gi).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('theme text and meaningful control boundaries meet contrast targets',()=>{
 const css=readFileSync(new URL('../dist/accessibility.css',import.meta.url),'utf8');
 const blocks=[...css.matchAll(/:root(?:\[data-theme=(?:dark|system)\])?\{([^}]+)\}/g)];assert.equal(blocks.length,3);
 for(const block of blocks){const colors=Object.fromEntries([...block[1].matchAll(/--([\w-]+):(#[a-f0-9]{6})/g)].map(m=>[m[1],m[2]]));
  for(const surface of ['paper','surface','subtle'])for(const text of ['ink','muted','green','warning'])assert.ok(contrast(colors[text],colors[surface])>=4.5,`${text} on ${surface}: ${contrast(colors[text],colors[surface])}`);
  assert.ok(contrast(colors['on-accent'],colors.green)>=4.5,'accent text');
  assert.ok(contrast(colors.control,colors.surface)>=3,'control border');
 }
});
