import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {handleAPI} from '../server/api.mjs';
try{process.loadEnvFile('.env.local');}catch{}
const root=path.resolve(import.meta.dirname,'../public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const portIndex=process.argv.indexOf('--port'),port=Number(portIndex>=0?process.argv[portIndex+1]:(process.env.PORT||5173));
http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host}`);let response;if(url.pathname.startsWith('/api/')){const init={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){init.body=req;init.duplex='half';}response=await handleAPI(new Request(url,init),process.env);}else{const name=url.pathname==='/'?'index.html':url.pathname.slice(1);const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error();response=new Response(await readFile(file),{headers:{'content-type':types[path.extname(file)]||'application/octet-stream'}});}res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'0.0.0.0',()=>console.log(`Studio listening on ${port}`));
