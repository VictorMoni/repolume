export const sections = [
 {key:'purpose',label:'Objetivo',pattern:/\b(sobre|objetivos?|proposta|about|overview|introduction|introducao|purpose|what is|acerca|proposito|introduccion)\b/,priority:1,tip:'Explique qual problema o projeto resolve e para quem ele foi criado.'},
 {key:'install',label:'Instalação',pattern:/\b(instalacao|instalar|installation|install|setup|getting started|como comecar|configuracao|requisitos|requirements|instalacion|empezar|configuracion|primeros pasos)\b/,priority:1,tip:'Documente os pré-requisitos e os passos para instalar e executar o projeto.'},
 {key:'usage',label:'Uso',pattern:/\b(uso|usar|usage|how to use|como usar|execution|executar|quick start|quickstart)\b/,priority:1,tip:'Mostre como usar o projeto, com um fluxo ou comando que possa ser reproduzido.'},
 {key:'tech',label:'Tecnologias',pattern:/\b(tecnologias|technologies|tech stack|stack|built with|feito com|ferramentas|tools|hecho con|herramientas)\b/,priority:2,tip:'Liste as principais tecnologias e explique brevemente suas escolhas.'},
 {key:'examples',label:'Exemplos e imagens',pattern:/\b(exemplos?|ejemplos?|examples?|screenshots?|capturas?|demonstracao|demostracion|demo|preview)\b/,priority:2,tip:'Inclua uma seção de exemplos, uma demonstração ou imagens que mostrem o resultado.'}
];
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Heuristic: recognize section titles, never claims about semantic correctness.
export function analyzeReadme(text){
 const lines=text.replace(/<!--[\s\S]*?-->/g,'').split(/\r?\n/);
 let fence=null;const clean=[];
 for(const line of lines){
  const mark=line.match(/^\s{0,3}(`{3,}|~{3,})/);
  if(mark){if(!fence)fence=mark[1];else if(mark[1][0]===fence[0]&&mark[1].length>=fence.length)fence=null;clean.push('');continue;}
  clean.push(fence?'':line);
 }
 const headings=[];
 clean.forEach((line,i)=>{
  const atx=line.match(/^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/);
  if(atx)headings.push(atx[1]);
  if(i&&/^\s{0,3}(?:={3,}|-{3,})\s*$/.test(line)&&clean[i-1].trim())headings.push(clean[i-1].trim());
 });
 const html=clean.join('\n');
 for(const h of html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi))headings.push(h[1].replace(/<[^>]+>/g,''));
 return sections.map(s=>({...s,found:headings.some(h=>s.pattern.test(normalize(h)))}));
}
export function decodeReadme(data){
 if(data?.encoding!=='base64'||typeof data.content!=='string'||(data.size>0&&!data.content))return null;
 try{return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));}catch{return null;}
}
export function priorities(repo){
 const items=[];
 const add=(priority,title,reason,action)=>items.push({priority,title,reason,action});
 if(!repo.description?.trim())add(1,'Explique o projeto em uma frase','Sem descrição, fica mais difícil entender o propósito antes de abrir o código.','Preencha a descrição no campo About do repositório.');
 if(repo.readme===false)add(1,'Crie o README','O GitHub não encontrou um README para este projeto.','Apresente o objetivo, a instalação e um exemplo de uso em um README.');
 if(repo.readme===null)add(1,'Verifique o README','A consulta ao GitHub não foi concluída; a ausência não foi confirmada.','Tente uma nova análise antes de decidir o que adicionar.');
 if(repo.readme===true&&repo.readmeReview==null)add(1,'Revise o conteúdo do README','O arquivo existe, mas seu conteúdo não pôde ser analisado.','Abra o README no GitHub e confira as seções manualmente.');
 for(const s of repo.readmeReview??[])if(!s.found)add(s.priority,`Revise: ${s.label}`,'Não identificamos um título correspondente em português, inglês ou espanhol. A informação pode estar em outro formato.',s.tip);
 if(!repo.topics?.length)add(2,'Contextualize com tópicos','Tópicos ajudam visitantes a reconhecer o assunto e as tecnologias.','Adicione tags relevantes no campo About do repositório.');
 if(!repo.license)add(3,'Considere as permissões de reutilização','Nenhuma licença foi identificada pelo GitHub. A necessidade depende de como você quer compartilhar o projeto.','Se quiser permitir reutilização, escolha uma licença adequada ao projeto.');
 return items.sort((a,b)=>a.priority-b.priority);
}
