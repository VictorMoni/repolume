import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeReadme,decodeReadme,priorities} from '../dist/review.mjs';
const keys=text=>analyzeReadme(text).filter(s=>s.found).map(s=>s.key);
test('recognizes accented Portuguese and mixed Markdown/HTML headings',()=>{
 assert.deepEqual(keys('# Objetivo\n## Instalação\nUso\n---\n<h2>Tecnologias</h2>\n### Exemplos'),['purpose','install','usage','tech','examples']);
});
test('recognizes English section variants',()=>{
 assert.deepEqual(keys('## Overview\n## Getting started\n## How to use\n## Built with\n## Screenshots'),['purpose','install','usage','tech','examples']);
});
test('ignores headings in code, comments and prose mentions',()=>{
 assert.deepEqual(keys('Installation and usage will be documented later.\n```md\n## Usage\n```\n~~~md\n## Installation\n~~~\n<!--\n## Objetivo\n-->'),[]);
 assert.deepEqual(keys('```\n~~~\n## Uso\n```\n## About'),['purpose']);
});
test('decodes UTF-8 and distinguishes unavailable from empty README',()=>{
 const source='## Instalação 🌱';
 assert.equal(decodeReadme({encoding:'base64',size:32,content:Buffer.from(source).toString('base64')}),source);
 assert.equal(decodeReadme({encoding:'none',content:''}),null);
 assert.equal(decodeReadme({encoding:'base64',size:123,content:''}),null);
 assert.equal(decodeReadme({encoding:'base64',size:0,content:''}),'');
 assert.equal(decodeReadme({encoding:'base64',content:'!!!'}),null);
});
test('unknown README never becomes missing-section suggestions',()=>{
 const base={description:'Projeto',topics:['web'],license:{},readmeReview:null};
 assert.deepEqual(priorities({...base,readme:null}).map(t=>t.title),['Verifique o README']);
 assert.deepEqual(priorities({...base,readme:true}).map(t=>t.title),['Revise o conteúdo do README']);
 assert.deepEqual(priorities({...base,readme:false}).map(t=>t.title),['Crie o README']);
});
test('priorities follow editorial order and complete projects have no suggestions',()=>{
 const r={description:'Projeto',topics:['web'],license:{},readme:true,readmeReview:analyzeReadme('## About\n## Installation\n## Usage\n## Technologies\n## Examples')};
 assert.equal(priorities(r).length,0);
 const pending=priorities({...r,description:null,license:null,topics:[],readmeReview:analyzeReadme('## About')});
 assert.deepEqual(pending.map(t=>t.priority),[1,1,1,2,2,2,3]);
 assert.ok(pending.some(t=>t.title==='Revise: Instalação'));
});
