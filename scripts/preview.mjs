import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
await build({entryPoints:['scripts/preview.ts'],bundle:true,platform:'browser',target:['es2020','safari14'],outfile:'preview.bundle.js'});
const routes=new Map([['/','scripts/preview.html'],['/preview.bundle.js','preview.bundle.js'],['/styles.css','styles.css']]);
const server=createServer(async(req,res)=>{const path=routes.get((req.url||'/').split('?')[0]);if(!path){res.writeHead(404);res.end('Not found');return;}try{const body=await readFile(path);res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(500);res.end('Preview not built');}});
server.listen(8776,'127.0.0.1',()=>console.log('Color Sprint preview: http://127.0.0.1:8776'));
