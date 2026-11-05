const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function normalizeGithubUser(input){
 let value=String(input??'').trim();
 if(/^(?:https?:\/\/)?github\.com\//i.test(value)){
  try{const url=new URL(/^https?:/i.test(value)?value:'https://'+value);if(url.hostname!=='github.com'||url.username||url.password)return null;const parts=url.pathname.split('/').filter(Boolean);if(parts.length!==1)return null;value=parts[0];}catch{return null;}
 }else value=value.replace(/^@/,'');
 return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value)&&!value.includes('--')?value:null;
}
export function filterProjects(repos,{query='',language='*',filter='all',selected=new Set(),hasPending=()=>false}={}){
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 return repos.filter(repo=>{
  const text=normalize([repo.name,repo.description,...(repo.topics??[])].join(' '));
  return terms.every(term=>text.includes(term))&&(language==='*'||(language==='__none'? !repo.language:repo.language===language))&&(filter==='all'||(filter==='selected'&&selected.has(repo.id))||(filter==='pending'&&hasPending(repo)));
 });
}
export function selectionKey(user,demo=false){return `repolume-selection-v1:${demo?'demo':'github:'+user.toLowerCase()}`;}
export function loadSelection(storage,user,demo=false){
 try{
  if(!storage)return {ids:new Set(),available:false};
  const raw=storage.getItem(selectionKey(user,demo));
  let values=[];try{values=JSON.parse(raw??'[]');}catch{}
  return {ids:new Set((Array.isArray(values)?values:[]).filter(id=>Number.isSafeInteger(id)&&id>0).slice(0,5000)),available:true};
 }catch{return {ids:new Set(),available:false};}
}
export function saveSelection(storage,user,ids,demo=false){
 try{if(!storage)return false;storage.setItem(selectionKey(user,demo),JSON.stringify([...ids]));return true;}catch{return false;}
}
// Keep a page-session copy even when browser storage cannot be written.
export function createSelectionSession(storage){
 const memory=new Map();
 return {
  load(user,demo=false){
   const key=selectionKey(user,demo);
   if(!memory.has(key))memory.set(key,loadSelection(storage,user,demo));
   const value=memory.get(key);return {ids:new Set(value.ids),available:value.available};
  },
  save(user,ids,demo=false){
   const available=saveSelection(storage,user,ids,demo);
   memory.set(selectionKey(user,demo),{ids:new Set(ids),available});return available;
  }
 };
}
