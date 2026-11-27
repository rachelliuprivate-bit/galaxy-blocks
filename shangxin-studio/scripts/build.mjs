import {readFile,mkdir,writeFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.md':'text/plain; charset=utf-8'};
const assets={};for(const name of await readdir(path.join(root,'public'))){assets['/'+name]={type:types[path.extname(name)]||'application/octet-stream',data:(await readFile(path.join(root,'public',name))).toString('base64')};}
assets['/']=assets['/index.html'];
const api=await readFile(path.join(root,'server/api.mjs'),'utf8');
const output=api+'\nconst assets='+JSON.stringify(assets)+`;\nexport default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return handleAPI(request,env);const asset=assets[url.pathname];if(!asset)return new Response('Not found',{status:404});if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const body=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'same-origin'}});}};\n`;
await rm(path.join(root,'dist'),{recursive:true,force:true});await mkdir(path.join(root,'dist/server'),{recursive:true});await mkdir(path.join(root,'dist/.openai'),{recursive:true});
await writeFile(path.join(root,'dist/server/index.js'),output);await writeFile(path.join(root,'dist/.openai/hosting.json'),await readFile(path.join(root,'.openai/hosting.json')));
console.log('Built Worker with embedded static assets.');
