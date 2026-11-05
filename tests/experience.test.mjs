import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeGithubUser} from '../dist/portfolio.mjs';
test('profile entry accepts usernames, handles and profile URLs',()=>{
 for(const value of ['octocat',' @octocat ','https://github.com/octocat','github.com/octocat/','https://github.com/octocat?tab=repositories'])assert.equal(normalizeGithubUser(value),'octocat');
 assert.equal(normalizeGithubUser('a'.repeat(39)),'a'.repeat(39));
});
test('profile entry rejects repository links and invalid identities',()=>{
 for(const value of ['',null,'@@octocat','two words','-user','user-','two--hyphens','a'.repeat(40),'https://github.com/a/repo','https://example.com/user','https://github.com@evil.com/a'])assert.equal(normalizeGithubUser(value),null,String(value));
});
test('only master is enabled for automatic Vercel deployments',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.git.deploymentEnabled.develop,false);
 assert.equal(config.git.deploymentEnabled.master,true);
 assert.notEqual(config.git.deploymentEnabled.develop,true);
});
