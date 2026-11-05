import {filterProjects,createSelectionSession,normalizeGithubUser} from './portfolio.mjs';
import {githubRequest as api} from './api.mjs';
import {makeReadme} from './readme.mjs';
import {analyzeReadme,decodeReadme,priorities} from './review.mjs';
import {translate,localizeTask,locales,localeTags} from './i18n.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function saved(key,fallback,choices){try{const value=localStorage.getItem(key);return choices.includes(value)?value:fallback;}catch{return fallback;}}
function persist(key,value){try{localStorage.setItem(key,value);}catch{}}
let lang=saved('repolume-language','pt',locales);
let repos=[],selected=new Set(),filter='all',page=1,user='',demo=false,busy=false,hasMore=false,excluded=0;
let storageAvailable=true;
function storage(){try{return localStorage;}catch{return null;}}
const selectionSession=createSelectionSession(storage());
function restoreSelection(){const result=selectionSession.load(user,demo);selected=result.ids;storageAvailable=result.available;}
function storeSelection(){storageAvailable=selectionSession.save(user,selected,demo);}
function resetProjectFilters(){filter='all';$('#project-query').value='';$('#project-language').value='*';}
function refreshLanguages(){const current=$('#project-language').value||'*';const languages=[...new Set(repos.map(r=>r.language).filter(Boolean))].sort((a,b)=>a.localeCompare(b,localeTags[lang]));$('#project-language').innerHTML='<option value="*">'+esc(t('allLanguages'))+'</option>'+languages.map(value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>').join('')+(repos.some(r=>!r.language)?'<option value="__none">'+esc(t('noLanguage'))+'</option>':'');$('#project-language').value=[...$('#project-language').options].some(o=>o.value===current)?current:'*';}
let statusKey='',statusParams={},lastError=null,formInvalid=false;
const t=(key,params={})=>translate(key,lang,params);
const labels=['Descrição','README','Licença','Tópicos'];
const priorityNames={1:'Essencial',2:'Próximo passo',3:'Opcional'};
const path=r=>`https://github.com/${encodeURIComponent(r.owner.login)}/${encodeURIComponent(r.name)}`;
const checks=r=>[!!r.description?.trim(),r.readme,!!r.license,!!r.topics?.length];
const score=r=>checks(r).filter(v=>v===true).length;
const tasks=r=>priorities(r).map(task=>localizeTask(task,lang));
const date=value=>new Date(value).toLocaleDateString(localeTags[lang]);
const external=(href,label,name=label)=>`<a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name+' ('+t('newTab')+')')}">${esc(label)}</a>`;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function revealResults(){
 $('#workspace').hidden=false;
 $('#profiletitle').focus({preventScroll:true});
 $('#workspace').scrollIntoView({behavior:reduceMotion()?'instant':'smooth',block:'start'});
}
function setStatus(key,params={}){statusKey=key;statusParams=params;$('#status').textContent=t(key,params);$('#global-status').textContent=t(key,params);}
function applyLanguage(){
 document.documentElement.lang=localeTags[lang];document.title=t('title');
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
 document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
 $('#username').placeholder=t('placeholder');$('#language').value=lang;
 if(formInvalid)$('#form-error').textContent=t('invalid');
 if(statusKey){$('#status').textContent=t(statusKey,statusParams);$('#global-status').textContent=t(statusKey,statusParams);}
 if(lastError)showError(lastError);
 if(!$('#workspace').hidden)render();
}
$('#language').addEventListener('change',()=>{lang=$('#language').value;persist('repolume-language',lang);applyLanguage();});
$('#theme').value=document.documentElement.dataset.theme||'system';
$('#theme').addEventListener('change',()=>{const theme=$('#theme').value;document.documentElement.dataset.theme=theme;persist('repolume-theme',theme);});
function reviewDetails(r){
 const review=r.readmeReview;
 const body=review?`<ul class="checks">${review.map(s=>`<li><span>${esc(t(s.label))}</span><span class="${s.found?'yes':'no'}">${s.found?'✓ '+esc(t('identified')):'＋ '+esc(t('check'))}</span></li>`).join('')}</ul>`:`<p class="tip">${esc(t(r.readme===false?'readmeMissing':r.readme===null?'readmeUnknown':'contentUnavailable'))}</p>`;
 return `<details class="readme-details" data-readme-id="${r.id}"><summary>${esc(t('readmeReview'))}${review?' · '+review.filter(s=>s.found).length+'/5':''}<span class="sr-only"> — ${esc(r.name)}</span></summary>${body}<p class="tip">${esc(t('detectionHelp'))}</p>${external(path(r)+'#readme',t('checkReadme'),t('checkReadme')+' — '+r.name)}</details>`;
}
function renderPriorities(){
 const scope=selected.size?repos.filter(r=>selected.has(r.id)):repos;
 const items=scope.flatMap(r=>tasks(r).map(task=>({...task,repo:r}))).sort((a,b)=>a.priority-b.priority||a.repo.name.localeCompare(b.repo.name,localeTags[lang]));
 $('#priority-scope').textContent=[t(selected.size?'selectedScope':'allScope'),t('suggestions',{count:items.length}),busy?t('running'):'',hasMore?t('moreAvailable'):''].filter(Boolean).join(' · ');
 $('#priority-list').innerHTML=items.map(task=>`<li><span class="priority-badge p${task.priority}">${esc(t(priorityNames[task.priority]))}</span><div>${external(path(task.repo),task.repo.name+' ↗')}<h4>${esc(task.title)}</h4><p>${esc(task.reason)}</p><p class="action">${esc(task.action)}</p></div></li>`).join('')||`<li class="empty">${esc(t(scope.length?'noTasks':selected.size?'noLoadedSelection':'startPlan'))}</li>`;
}
function render(){
 // Restore the active control after list updates. Without this, keyboard selection loses focus.
 const active=document.activeElement;
 const activeId=active?.matches('[data-id]')?active.dataset.id:null;
 const openMetadata=new Set([...document.querySelectorAll('[data-meta-id][open]')].map(el=>el.dataset.metaId));
 const openDetails=new Set([...document.querySelectorAll('[data-readme-id][open]')].map(el=>el.dataset.readmeId));
 const complete=repos.filter(r=>score(r)===4).length;
 $('#mode').textContent=t(demo?'demoMode':'mode');$('#profiletitle').textContent=demo?t('demoTitle'):t('profileTitle',{user});
 $('#summary').innerHTML=[[repos.length,'reviewed'],[complete,'complete'],[repos.length-complete,'attention']].map(([n,key])=>`<div class="stat"><b>${n}</b><span>${esc(t(key))}</span></div>`).join('');
 $('#count').textContent=selected.size?String(selected.size):'';
 $('#count').hidden=selected.size===0;
 $('#scope').textContent=[demo?t('fiction'):'',t('scope',{count:repos.length,excluded}),hasMore?t('moreAvailable'):''].filter(Boolean).join(' ');
 const loadedSelected=repos.filter(r=>selected.has(r.id)).length;
 $('#selection-note').textContent=t(storageAvailable?'selectionSaved':'selectionMemory');
 $('#selection-pending').hidden=selected.size===loadedSelected;$('#selection-pending').textContent=t('selectionPending',{count:selected.size-loadedSelected});
 $('#clear-selection').disabled=selected.size===0;
 $('#export').textContent=t(selected.size?'downloadSelected':'downloadAll',{count:selected.size?loadedSelected:repos.length});
 $('#download-help').textContent=t(selected.size?'downloadHelpSelected':'downloadHelpAll',{count:selected.size?loadedSelected:repos.length});
 $('#guide-help').textContent=t(loadedSelected?'guideSelected':'guideChoose',{count:loadedSelected});
 $('#choose-projects').textContent=t(loadedSelected?'reviewPlan':'chooseProjects');
 refreshLanguages();
 $('#more').hidden=!hasMore||demo;$('#more').disabled=busy;$('#export').disabled=!repos.length||busy||(selected.size>0&&!loadedSelected);
 $('#analyze').disabled=busy;$('#demo').disabled=busy;$('#search').setAttribute('aria-busy',String(busy));
 renderPriorities();
 const searchable=repos.map(r=>r.demoDescription?{...r,description:t(r.demoDescription)}:r);
 const list=filterProjects(searchable,{query:$('#project-query').value,language:$('#project-language').value,filter,selected,hasPending:r=>priorities(r).length>0}).sort((a,b)=>$('#sort').value==='name'?a.name.localeCompare(b.name,localeTags[lang]):$('#sort').value==='updated'?new Date(b.updated_at)-new Date(a.updated_at):score(b)-score(a)||a.name.localeCompare(b.name,localeTags[lang]));
 $('#cards').innerHTML=list.map(r=>{
  const c=checks(r),unknown=c.some(v=>v===null),first=tasks(r)[0];
  return `<article class="card ${selected.has(r.id)?'selected':''}" aria-labelledby="repo-${r.id}"><div class="cardhead"><h3 id="repo-${r.id}">${external(path(r),r.name+' ↗')}</h3><span class="score">${score(r)}/4${unknown?' · ?':''}</span></div><p>${esc(r.demoDescription?t(r.demoDescription):r.description||t('noDescription'))}</p><div class="meta"><span>● ${esc(r.language||t('noLanguage'))}</span><span>${esc(t('updated',{date:date(r.updated_at)}))}</span></div><details class="metadata-details" data-meta-id="${r.id}"><summary>${esc(t('metadataDetails'))} · ${score(r)}/4</summary><ul class="checks">${c.map((v,i)=>`<li><span>${esc(t(labels[i]))}</span><span class="${v===true?'yes':v===false?'no':'unknown'}">${esc(v===true?'✓ '+t('present'):v===false?'＋ '+t('add'):'? '+t('unverified'))}</span></li>`).join('')}</ul></details><p class="next-label">${esc(t('nextImprovement'))}</p><p class="tip">${esc(first?first.action:t('goodBase'))}</p>${reviewDetails(r)}<div class="cardbottom"><label class="select"><input type="checkbox" data-id="${r.id}" aria-label="${esc(t('highlightProject',{name:r.name}))}" ${selected.has(r.id)?'checked':''}>${esc(t('highlight'))}</label>${external(path(r),t('viewGithub'),t('viewGithub')+' — '+r.name)}<button class="secondary generate-readme" data-generate="${r.id}" aria-haspopup="dialog" aria-label="${esc(t('generateFor',{name:r.name}))}">${esc(t('generateReadme'))}</button></div></article>`;
 }).join('')||`<p class="empty">${esc(t($('#project-query').value.trim()||$('#project-language').value!=='*'?'emptySearch':filter==='selected'?'emptySelected':filter==='pending'?'emptyPending':'emptyAll'))}</p>`;
 document.querySelectorAll('[data-meta-id]').forEach(el=>{el.open=openMetadata.has(el.dataset.metaId);});
 document.querySelectorAll('[data-readme-id]').forEach(el=>{el.open=openDetails.has(el.dataset.readmeId);});
 if(activeId){const restored=document.querySelector(`[data-id="${activeId}"]`);if(restored)restored.focus({preventScroll:true});else document.querySelector(`[data-filter="${filter}"]`).focus({preventScroll:true});}
 const resultText=t('results',{count:list.length,selected:loadedSelected});
 if($('#results-status').textContent!==resultText)$('#results-status').textContent=resultText;
 syncFilters();
}
function showError(error){
 lastError=error;const key=error.key||(error.name==='TimeoutError'?'timeout':'network');
 const retry=error.params?.reset?t('retryAfter',{time:new Date(error.params.reset*1000).toLocaleTimeString(localeTags[lang],{hour:'2-digit',minute:'2-digit'})}):'';
 $('#error').textContent=t(key,error.params)+' '+retry;$('#error').hidden=false;
}
async function load(more=false){
 if(busy)return;busy=true;$('#analyze').disabled=true;$('#demo').disabled=true;$('#more').disabled=true;$('#export').disabled=true;$('#search').setAttribute('aria-busy','true');$('#error').hidden=true;lastError=null;setStatus('loading');
 const target=more?user:$('#username').value.trim();
 try{
  const profile=more?null:await api(`/users/${encodeURIComponent(target)}`);
  const next=more?page+1:1;
  const raw=await api(`/users/${encodeURIComponent(target)}/repos?per_page=20&sort=updated&direction=desc&page=${next}`);
  if(!more){user=profile.login;repos=[];excluded=0;demo=false;restoreSelection();resetProjectFilters();}
  page=next;hasMore=raw.length===20;excluded+=raw.filter(r=>r.fork||r.archived).length;
  const incoming=raw.filter(r=>!r.fork&&!r.archived&&!repos.some(old=>old.id===r.id)).map(r=>({...r,readme:null,readmeReview:null}));repos.push(...incoming);
  $('#workspace').hidden=false;render();revealResults();
  let done=0,rateStop=false;const queue=[...incoming];
  async function worker(){while(queue.length&&!rateStop){const r=queue.shift();try{const data=await api(`/repos/${encodeURIComponent(r.owner.login)}/${encodeURIComponent(r.name)}/readme`,true);r.readme=!!data;const text=decodeReadme(data);r.readmeReview=text===null?null:analyzeReadme(text);}catch(error){r.readme=null;r.readmeReview=null;if(error.key==='rateLimit'){rateStop=true;showError(error);}}done++;setStatus('progress',{done,total:incoming.length});render();}}
  await Promise.all([worker(),worker()]);
  const unknown=repos.filter(r=>r.readme===null||(r.readme===true&&r.readmeReview===null)).length;setStatus(unknown?'partial':'done',{count:unknown});
 }catch(error){showError(error);setStatus('failed');$('#error').focus();}finally{busy=false;$('#analyze').disabled=false;$('#demo').disabled=false;$('#search').setAttribute('aria-busy','false');if(!$('#workspace').hidden)render();}
}
function syncFilters(){document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));}
function clearValidation(){formInvalid=false;$('#username').removeAttribute('aria-invalid');$('#form-error').hidden=true;}
$('#username').addEventListener('input',clearValidation);
$('#search').addEventListener('submit',event=>{event.preventDefault();const field=$('#username');const normalized=normalizeGithubUser(field.value);if(!normalized){formInvalid=true;field.setAttribute('aria-invalid','true');$('#form-error').textContent=t('invalid');$('#form-error').hidden=false;field.focus();return;}field.value=normalized;clearValidation();load();});
$('#more').addEventListener('click',()=>load(true));$('#sort').addEventListener('change',render);
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;render();}));
$('#cards').addEventListener('change',event=>{if(!event.target.matches('[data-id]'))return;const id=Number(event.target.dataset.id);event.target.checked?selected.add(id):selected.delete(id);storeSelection();render();});
$('#method').addEventListener('click',()=>$('#criteria').showModal());$('#close').addEventListener('click',()=>$('#criteria').close());$('#criteria').addEventListener('close',()=>$('#method').focus());
$('#demo').addEventListener('click',()=>{
 if(busy)return;demo=true;user='demonstracao';restoreSelection();resetProjectFilters();hasMore=false;excluded=0;lastError=null;clearValidation();
 const examples=[['jardim-digital','plant','TypeScript',true,true,['plants','web']],['receitas-de-casa','recipes','JavaScript',true,false,[]],['meu-primeiro-site',null,'HTML',false,false,['learning']]];
 repos=examples.map((x,i)=>({id:i+1,name:x[0],demoDescription:x[1],description:x[1]?'demo':null,language:x[2],readme:x[3],license:x[4]?{name:'MIT'}:null,topics:x[5],updated_at:'2026-10-20T12:00:00Z',owner:{login:'exemplo'}}));
 repos[0].readmeReview=analyzeReadme('## Objetivo\n## Instalação\n## Uso\n## Tecnologias\n## Exemplos');repos[1].readmeReview=analyzeReadme('## Sobre\n## Tecnologias');
 setStatus('demoStatus');$('#workspace').hidden=false;$('#error').hidden=true;render();revealResults();
});
$('#export').addEventListener('click',()=>{
 const list=selected.size?repos.filter(r=>selected.has(r.id)):repos;
 const text=[`# ${t('exportTitle')} — ${demo?t('exportDemo'):'@'+user}`,t('generated',{date:date(new Date())}),t('exportScope',{count:list.length,scope:t(selected.size?'selectedScope':'allScope')}),hasMore?t('moreAvailable'):'',t('footnote'),...list.map(r=>`\n## ${r.name}\n\n${path(r)}\n\n${t('presentation')}: ${score(r)}/4\n\n${checks(r).map((v,i)=>`- [${v===true?'x':' '}] ${t(labels[i])} — ${t(v===true?'present':v===false?'add':'unverified')}`).join('\n')}\n\n### ${t('readmeSections')}\n\n${r.readmeReview?r.readmeReview.map(s=>'- '+t(s.label)+': '+t(s.found?'identified':'notIdentified')).join('\n'):t('notReviewed')}\n\n### ${t('exportPriorities')}\n\n${tasks(r).map(task=>'- **'+t(priorityNames[task.priority])+' — '+task.title+'**: '+task.action+' '+task.reason).join('\n')||t('noTasks')}`)].join('\n\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`repolume-${user}-${lang}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#results-status').textContent=t('exported');
});
// Search and filtering never change the selection or export scope.
$('#project-query').addEventListener('input',render);$('#project-language').addEventListener('change',render);
$('#reset-filters').addEventListener('click',()=>{resetProjectFilters();render();$('#project-query').focus();});
$('#clear-selection').addEventListener('click',()=>{selected.clear();if(filter==='selected')filter='all';storeSelection();render();$('#global-status').textContent=t('selectionCleared');document.querySelector(`[data-filter="${filter}"]`).focus();});
let generatorRepo=null,generatorOpener=null;
function downloadText(text,name){const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function updateDraft(){if(!generatorRepo)return;const fields={};for(const key of ['title','description','objective','installation','usage','technologies'])fields[key]=$('#draft-'+key).value;$('#draft-output').value=makeReadme(generatorRepo,fields,$('#draft-language').value);$('#draft-output').lang=localeTags[$('#draft-language').value];$('#draft-status').textContent=t('draftUpdated');}
$('#cards').addEventListener('click',event=>{const button=event.target.closest('[data-generate]');if(!button)return;generatorRepo=repos.find(r=>r.id===Number(button.dataset.generate));if(!generatorRepo)return;generatorOpener=generatorRepo.id;$('#generator-project').textContent=generatorRepo.owner.login+'/'+generatorRepo.name;$('#draft-language').value=lang;$('#draft-title').value=generatorRepo.name;$('#draft-description').value=generatorRepo.demoDescription?t(generatorRepo.demoDescription):generatorRepo.description||'';$('#draft-technologies').value=generatorRepo.language||'';for(const field of ['objective','installation','usage'])$('#draft-'+field).value='';updateDraft();$('#generator').showModal();});
$('#draft-update').addEventListener('click',()=>{updateDraft();$('#draft-output').focus();$('#draft-output').scrollIntoView({behavior:reduceMotion()?'instant':'smooth',block:'center'});});
$('#generator-close').addEventListener('click',()=>$('#generator').close());
$('#generator').addEventListener('close',()=>{document.querySelector('[data-generate="'+generatorOpener+'"]')?.focus();if(!document.querySelector('[data-generate="'+generatorOpener+'"]'))$('#profiletitle').focus();$('#draft-output').value='';generatorRepo=null;});
$('#draft-download').addEventListener('click',()=>{const text=$('#draft-output').value;if(!text.trim()){$('#draft-status').textContent=t('emptyDraft');$('#draft-output').focus();return;}downloadText(text,'README.md');$('#draft-status').textContent=t('draftDownloaded');});
$('#choose-projects').addEventListener('click',()=>{resetProjectFilters();filter=repos.some(r=>selected.has(r.id))?'selected':'all';render();$('#projects-title').focus({preventScroll:true});$('#projects-title').scrollIntoView({behavior:reduceMotion()?'instant':'smooth',block:'start'});});
applyLanguage();
