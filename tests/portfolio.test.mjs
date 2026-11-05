import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterProjects,loadSelection,saveSelection,selectionKey} from '../dist/portfolio.mjs';
import {makeReadme} from '../dist/readme.mjs';
import {analyzeReadme} from '../dist/review.mjs';
const repos=[{id:1,name:'jardim',description:'Diário de plantas',language:'TypeScript',topics:['web']},{id:2,name:'receitas',description:'Comida caseira',language:'JavaScript',topics:['família']},{id:3,name:'site',description:null,language:null,topics:[]}];
test('search matches name, description and topics without case or accent differences',()=>{
 assert.deepEqual(filterProjects(repos,{query:'DIARIO web'}).map(r=>r.id),[1]);
 assert.deepEqual(filterProjects(repos,{query:'familia'}).map(r=>r.id),[2]);
 assert.deepEqual(filterProjects(repos,{query:'  SITE  '}).map(r=>r.id),[3]);
 assert.deepEqual(filterProjects(repos,{query:'inexistente'}),[]);
});
test('search, language, pending and selected filters compose without mutating input',()=>{
 const selected=new Set([1,2]);
 assert.deepEqual(filterProjects(repos,{query:'receitas',language:'JavaScript',filter:'selected',selected}).map(r=>r.id),[2]);
 assert.deepEqual(filterProjects(repos,{language:'__none'}).map(r=>r.id),[3]);
 assert.deepEqual(filterProjects(repos,{filter:'pending',hasPending:r=>r.id===2}).map(r=>r.id),[2]);
 assert.deepEqual(filterProjects(repos,{query:'receitas',language:'TypeScript'}),[]);
 assert.equal(repos.length,3);assert.deepEqual([...selected],[1,2]);
});
function memoryStorage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
test('selection survives reload and stays isolated per profile and demo',()=>{
 const storage=memoryStorage();
 assert.ok(saveSelection(storage,'Octocat',new Set([1,7])));
 assert.deepEqual([...loadSelection(storage,'octocat').ids],[1,7]);
 assert.deepEqual([...loadSelection(storage,'another-user').ids],[]);
 assert.deepEqual([...loadSelection(storage,'octocat',true).ids],[]);
 saveSelection(storage,'octocat',new Set([2]),true);
 assert.deepEqual([...loadSelection(storage,'octocat',true).ids],[2]);
 saveSelection(storage,'octocat',new Set());
 assert.deepEqual([...loadSelection(storage,'octocat').ids],[]);
 assert.deepEqual([...loadSelection(storage,'octocat',true).ids],[2]);
});
test('corrupt or blocked storage does not break the app',()=>{
 const storage=memoryStorage();storage.setItem(selectionKey('user'),'{broken');assert.equal(loadSelection(storage,'user').ids.size,0);
 storage.setItem(selectionKey('user'),JSON.stringify([1,1,'2',-1,null,3]));assert.deepEqual([...loadSelection(storage,'user').ids],[1,3]);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(loadSelection(blocked,'user').available,false);assert.equal(saveSelection(blocked,'user',new Set([1])),false);
 assert.equal(loadSelection(null,'user').available,false);
});
const repo={name:'my-project',description:'A real project.',language:'JavaScript',owner:{login:'example'}};
test('README templates work in all three languages and do not invent commands or licenses',()=>{
 for(const lang of ['pt','en','es']){
  const text=makeReadme(repo,{},lang);assert.ok(text.includes('https://github.com/example/my-project'));
  assert.ok(text.includes('A real project.'));assert.ok(text.includes('JavaScript'));assert.ok(!text.includes('npm install'));assert.ok(!text.includes('MIT'));
  assert.ok(analyzeReadme(text).every(s=>s.found));
 }
 assert.match(makeReadme(repo,{},'en'),/Draft generated/);
 assert.match(makeReadme(repo,{},'es'),/Borrador generado/);
});
test('README fields and command fencing preserve user content safely',()=>{
 const text=makeReadme({...repo,description:'<img src=x onerror=alert(1)>'},{title:'Project [test]',objective:'For gardeners.',installation:'echo "```"\nrun-real-command',usage:'Open the app.',technologies:'Custom stack'},'en');
 assert.ok(text.includes('# Project \\[test\\]'));assert.ok(text.includes('\\<img'));assert.ok(text.includes('````\necho "```"\nrun-real-command\n````'));
 assert.ok(text.includes('For gardeners.'));assert.ok(text.includes('Custom stack'));
 const licensed=makeReadme({...repo,license:{name:'Apache License 2.0'}},{},'es');assert.ok(licensed.includes('Apache License 2.0'));assert.ok(!licensed.includes('MIT'));
});
