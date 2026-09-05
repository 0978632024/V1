const http=require('node:http'), fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const port=Number(process.env.PORT||4173);
http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=pathname==='/sw.js'?'sw.js':pathname==='/'||pathname==='/index.html'?'index.html':null;
  if(!file) { res.writeHead(404);res.end('Not found');return; }
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');
  res.setHeader('Cache-Control','no-cache');
  fs.createReadStream(path.join(root,file)).on('error',()=>{res.statusCode=500;res.end('Build first');}).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`TapThrough preview http://127.0.0.1:${port}`));
