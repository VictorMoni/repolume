import {translate} from './i18n.mjs';
const markdownText=value=>String(value??'').trim().replace(/[\\`*_{}\[\]<>#|]/g,'\\$&');
function commandBlock(value){const runs=String(value).match(/`+/g)??[];const fence='`'.repeat(Math.max(3,...runs.map(run=>run.length+1)));return `${fence}\n${value.trim()}\n${fence}`;}
export function makeReadme(repo,fields={},lang='pt'){
 const t=key=>translate(key,lang);
 const field=(key,fallback)=>String(fields[key]??'').trim()||t(fallback);
 const license=repo.license?.name?markdownText(repo.license.name)+'\n\n'+t('readmeLicenseExisting'):t('readmeLicenseHint');
 const repository=`https://github.com/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`;
 return [
  '# '+markdownText(fields.title?.trim()||repo.name),
  '> '+t('readmeDraftNotice'),
  markdownText(fields.description?.trim()||repo.description||t('readmeDescriptionHint')),
  '## '+t('Objetivo'),field('objective','readmeObjectiveHint'),
  '## '+t('Instalação'),fields.installation?.trim()?commandBlock(fields.installation):t('readmeInstallHint'),
  '## '+t('Uso'),field('usage','readmeUsageHint'),
  '## '+t('Tecnologias'),fields.technologies?.trim()||markdownText(repo.language||t('readmeTechHint')),
  '## '+t('Exemplos e imagens'),t('readmeExamplesHint'),
  '## '+t('Licença'),license,
  '## '+t('readmeRepository'),repository
 ].join('\n\n')+'\n';
}
