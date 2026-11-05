import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const requested=decodeURIComponent(url.pathname);
  const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if(!file.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Repolume: http://127.0.0.1:4173'));
