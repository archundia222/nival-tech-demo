const fs=require('fs'),Module=require('module'),assert=require('node:assert/strict');
const t={exports:require('typescript')};
const code=t.exports.transpileModule(fs.readFileSync('src/app/api/assistant/route.ts','utf8'),{compilerOptions:{module:t.exports.ModuleKind.CommonJS,target:t.exports.ScriptTarget.ES2022}}).outputText;
let state={};let externalCalls=0;let writes=[];
function query(table,admin=false){let filters={};let method='read';let payload;
 const q={select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(){return q},maybeSingle(){return q},single(){return q},update(p){method='update';payload=p;return q},upsert(p){method='upsert';payload=p;return q},insert(p){method='insert';payload=p;return q},delete(){method='delete';return q},then(resolve){let data=null,error=null;
 if(table==='business_members')data=state.role?{role:state.role}:null;
 if(table==='assistant_conversations')data=state.conversation?{id:state.conversation}:null;
 if(table==='assistant_business_memory')data={content:''};
 if(table==='assistant_messages')data=[];
 if(method!=='read')writes.push({table,method,filters,admin,payload});
 return Promise.resolve({data,error,count:0}).then(resolve);}};return q;
}
const client={auth:{getUser:async()=>({data:{user:state.user?{id:state.user}:null}})},from:(t)=>query(t),rpc:async(name)=>({data:name==='can_use_nival_assistant'?true:{clientes_total:3},error:null})};
const admin={from:(t)=>query(t,true),rpc:async()=>({data:state.quota,error:null})};
const r=new Module('/tmp/route.cjs');r.require=(name)=>name==='next/server'?{NextResponse:{json:(body,opts)=>({body,status:opts?.status??200})}}:name==='@supabase/supabase-js'?{createClient:()=>admin}:{createClient:async()=>client};r._compile(code,'/tmp/route.cjs');
const businessId='00000000-0000-0000-0000-000000000001',conversationId='00000000-0000-0000-0000-000000000002';
async function run(body,origin='https://nival.test'){return r.exports.POST({headers:{get:()=>origin},nextUrl:{origin:'https://nival.test'},text:async()=>JSON.stringify(body)});}
(async()=>{
 const body={action:'send',businessId,conversationId,message:'Visitas?'};
 assert.equal((await run(body,'https://other.test')).status,403);
 assert.equal((await run(body)).status,401);
 state={user:'user-a',role:'staff'};assert.equal((await run(body)).status,403);
 state.role='owner';assert.equal((await run(body)).status,404);
 state.conversation=conversationId;assert.equal((await run(body)).status,503);
 process.env.OPENAI_API_KEY='test-only';process.env.OPENAI_MODEL='test-only';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 state.quota=false;assert.equal((await run(body)).status,429);assert.equal(externalCalls,0);
 state.quota=true;global.fetch=async()=>{externalCalls++;return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Hay 3 clientes registrados.'}]}]})}};
 assert.equal((await run(body)).status,200);
 const saved=writes.find(w=>w.table==='assistant_messages');assert.equal(saved.payload.length,2);assert(saved.payload.every(m=>m.business_id===businessId&&m.user_id==='user-a'&&m.conversation_id===conversationId));
 global.fetch=async()=>{throw Error('timeout')};writes=[];assert.equal((await run(body)).status,503);assert(!writes.some(w=>w.table==='assistant_messages'));assert(writes.some(w=>w.table==='assistant_usage'&&w.payload.busy_until===null));
 assert.equal((await run({...body,message:'x'.repeat(2001)})).status,400);
 console.log('PASS: origin, unauthenticated, staff, unavailable conversation, missing configuration, quota, scoped persistence, timeout cleanup, input limit. Mocked provider/database; no live API calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
