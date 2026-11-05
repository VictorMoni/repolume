import {test} from 'node:test';
import assert from 'node:assert/strict';
import {githubRequest} from '../dist/api.mjs';
import {createSelectionSession} from '../dist/portfolio.mjs';
import {analyzeReadme} from '../dist/review.mjs';
const response=(status,message,headers={})=>async()=>new Response(JSON.stringify({message}),{status,headers});
test('ordinary HTTP 403 is not misreported as an API rate limit',async()=>{
 await assert.rejects(githubRequest('/repos/a/b',false,response(403,'Repository access blocked',{'x-ratelimit-remaining':'59'})),error=>error.key==='httpError'&&error.params.code===403);
});
test('primary, secondary and 429 rate limits have the right retry guidance',async()=>{
 await assert.rejects(githubRequest('/users/a',false,response(403,'API rate limit exceeded',{'x-ratelimit-remaining':'0','x-ratelimit-reset':'2000000000'})),error=>error.key==='rateLimit'&&error.params.reset===2000000000);
 const before=Math.ceil(Date.now()/1000);
 await assert.rejects(githubRequest('/users/a',false,response(403,'Secondary rate limit',{'retry-after':'60','x-ratelimit-remaining':'50','x-ratelimit-reset':'2000000000'})),error=>error.key==='rateLimit'&&error.params.reset>=before+60&&error.params.reset<=before+62);
 await assert.rejects(githubRequest('/users/a',false,response(429,'Too many requests')),error=>error.key==='rateLimit');
});
test('missing README and unknown user remain distinct',async()=>{
 assert.equal(await githubRequest('/repos/a/b/readme',true,response(404,'Not Found')),null);
 await assert.rejects(githubRequest('/users/a',false,response(404,'Not Found')),error=>error.key==='notFound');
});
test('blocked storage preserves selections for the page session across profiles and reanalysis',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const session=createSelectionSession(blocked);
 assert.equal(session.load('a').available,false);
 assert.equal(session.save('a',new Set([9])),false);
 assert.deepEqual([...session.load('b').ids],[]);
 assert.deepEqual([...session.load('A').ids],[9]);
 assert.deepEqual([...session.load('a',true).ids],[]);
 session.save('a',new Set());assert.equal(session.load('a').ids.size,0);
});
test('write-only storage failure keeps edits without reverting to old saved IDs',()=>{
 const readOnly={getItem:()=>JSON.stringify([7]),setItem(){throw Error('quota');}};
 const session=createSelectionSession(readOnly);
 assert.deepEqual([...session.load('a').ids],[7]);
 session.save('a',new Set([9]));
 assert.deepEqual([...session.load('a').ids],[9]);assert.equal(session.load('a').available,false);
});
test('README code examples do not become section detections',()=>{
 const text='```md\n## About\n```not-a-closing-fence\n## Installation\n```\n## Usage';
 assert.deepEqual(analyzeReadme(text).filter(s=>s.found).map(s=>s.key),['usage']);
 assert.equal(analyzeReadme('<pre><h2>Installation</h2></pre>').some(s=>s.found),false);
 assert.equal(analyzeReadme('<code><h2>Usage</h2></code>').some(s=>s.found),false);
 assert.equal(analyzeReadme('<h2>Installation</h3>').some(s=>s.found),false);
});
