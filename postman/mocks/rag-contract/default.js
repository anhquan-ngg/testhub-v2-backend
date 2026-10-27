/** Narrow local dependency fixture based on contracts/rag-indexing.openapi.json. */
const http=require('http'),{createHash}=require('crypto');
const document='11111111-1111-4111-8111-111111111111',version='22222222-2222-4222-8222-222222222222';
http.createServer((req,res)=>{
 const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
 if(req.headers['x-internal-token']!=='postman-local-fixture-token-1234567890')return send(401,{detail:{code:'RAG_UNAUTHORIZED',retryable:false}});
 let raw='';req.on('data',chunk=>raw+=chunk);req.on('end',()=>{
 let body;try{body=JSON.parse(raw);}catch{return send(422,{detail:{code:'RAG_INPUT_INVALID',retryable:false}});}
 if(req.url==='/rag/outline'){
 if(body.title==='fixture-unavailable')return send(503,{detail:{code:'RAG_STORAGE_UNAVAILABLE',retryable:true}});
 return send(200,{contract_version:'knowledge-outline.v1',index_id:body.index_id,document_id:document,version_id:version,source_sha256:'a'.repeat(64),nodes:[{id:'33333333-3333-4333-8333-333333333333',parent_id:null,name:'Stacks',source_units:[{kind:'PAGE',position:1}],origin:'HEADING',evidence:'Chapter 1 Stacks'}],source_units:[{kind:'PAGE',position:1}],warnings:['REVIEW_CONTENT_MAP']});}
 if(req.url==='/rag/generate'&&Array.isArray(body.plan_items)){let count=0;return send(200,{contract_version:'rag-generation.v1',profile_id:body.profile_id,quality_status:'UNASSESSED',questions:body.plan_items.flatMap(item=>Array.from({length:item.count},()=>{
 const text='Evidence for '+item.knowledge_title+'.',unit=item.source_units[0];
 return {question_text:'Question '+(++count)+': '+item.knowledge_title+'?',question_type:item.question_type,question_format:item.question_format,correct_answer:null,options:Array.from({length:4},(_,i)=>({text:'Choice '+i,isCorrect:i<(item.question_type==='MULTIPLE_CHOICE'?2:1)})),plan_item_id:item.id,citations:[{quote:text,chunk:{ordinal:0,chunk_id:'44444444-4444-4444-8444-444444444444',index_id:body.index_ids[0],document_id:document,version_id:version,source_sha256:'a'.repeat(64),text_sha256:createHash('sha256').update(text).digest('hex'),kind:unit.kind,position:unit.position,start_offset:0,end_offset:text.length,text,similarity:1}}]};}))});}
 send(501,{detail:{code:'RAG_FIXTURE_NOT_IMPLEMENTED',retryable:false}});
 });
}).listen(process.env.PORT||4519);
