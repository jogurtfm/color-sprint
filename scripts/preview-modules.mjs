// Local design harness only. No production bundles, vault or account connection.
import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
await mkdir('test-results/modules',{recursive:true});
await build({entryPoints:['prototypes/modules/preview.ts'],bundle:true,format:'esm',splitting:true,chunkNames:'chunk-[hash]',loader:{'.md':'text'},outdir:'test-results/modules',platform:'browser',target:['es2020','safari14'],logLevel:'info'});
const routes=new Map([['/','prototypes/modules/index.html'],['/modules.css','src/modules/modules.css'],['/preview.css','prototypes/modules/preview.css']]);
const server=createServer(async(req,res)=>{try{if(req.headers.host!=='127.0.0.1:8790')throw new Error('Unsupported preview host');const url=(req.url||'/').split('?')[0],file=routes.get(url)||(/^\/(preview|chunk-[A-Z0-9]+)\.js$/.test(url)?'test-results/modules'+url:'');if(!file){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.setHeader('Cache-Control','no-store');res.end(await readFile(file));}catch{res.writeHead(500);res.end('Preview unavailable');}});
await new Promise(resolve=>server.listen(8790,'127.0.0.1',resolve));console.log('Task-module design preview · http://127.0.0.1:8790 · temporary sample data only');
