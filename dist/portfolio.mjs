const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
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
