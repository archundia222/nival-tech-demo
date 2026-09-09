const NIVAL = (() => {
  const KEY = "nival_tech_demo_v7";
  const MS_PER_DAY = 1000*60*60*24;
  const formatLocalDate = date => {
    const year=date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,"0");
    const day=String(date.getDate()).padStart(2,"0");
    return `${year}-${month}-${day}`;
  };
  const parseLocalDate = value => {
    const [year,month,day]=String(value).split("-").map(Number);
    return new Date(year,month-1,day);
  };
  const today = () => formatLocalDate(new Date());
  const daysAgo = days => {
    const date=parseLocalDate(today());
    date.setDate(date.getDate()-days);
    return formatLocalDate(date);
  };
  const nowIso = () => new Date().toISOString();

  const seed = {
    schemaVersion:2,
    activeBusinessId:"barberia-norte",
    businesses: [{
      id:"barberia-norte",
      name:"Barbería Norte",
      whatsapp:"+52 55 3904 4788",
      instagram:"@archundia_222",
      location:"Ciudad de México · Demo",
      hours:"Lun–Sáb · 10:00–20:00",
      bank:{
        holder:"NOMBRE DEL TITULAR · DEMO",
        alias:"BARBERIA NORTE · DEMO",
        account:"0000000000",
        clabe:"000000000000000000"
      },
      advisorWhatsapp:"525539044788",
      advisorInstagram:"@archundia_222"
    }],
    staff: [
      {id:"emp-diego",businessId:"barberia-norte",name:"Diego",email:"staff@nival.demo",password:"demo1234",role:"Barbero"},
      {id:"emp-owner",businessId:"barberia-norte",name:"Gerente Demo",email:"owner@nival.demo",password:"nival2026",role:"Dueño"}
    ],
    clients: [
      {id:"c1",businessId:"barberia-norte",name:"Carlos Martínez",phone:"5511111111",email:"carlos@demo.mx",declaredType:"Recurrente",declaredFreq:"Cada 3 semanas",createdAt:daysAgo(75),visits:[63,42,21,12].map(daysAgo)},
      {id:"c2",businessId:"barberia-norte",name:"Miguel Herrera",phone:"5522222222",email:"miguel@demo.mx",declaredType:"Recurrente",declaredFreq:"Cada 2 semanas",createdAt:daysAgo(150),visits:[134,120,106,92,78,64,50,36,22,8].map(daysAgo)},
      {id:"c3",businessId:"barberia-norte",name:"Javier Ortega",phone:"5533333333",email:"javier@demo.mx",declaredType:"Ocasional",declaredFreq:"Cada mes",createdAt:daysAgo(145),visits:[135,105,75,45].map(daysAgo)},
      {id:"c4",businessId:"barberia-norte",name:"Roberto Silva",phone:"5544444444",email:"roberto@demo.mx",declaredType:"Recurrente",declaredFreq:"Cada 2 semanas",createdAt:daysAgo(220),visits:[206,192,178,164,150,136,122,108,94,80].map(daysAgo)}
    ],
    requests: [],
    rewards: [
      {milestone:5,title:"20% de descuento",description:"En tu próximo corte"},
      {milestone:10,title:"Servicio premium",description:"Beneficio especial del negocio"},
      {milestone:15,title:"Cliente VIP",description:"Acceso a beneficio exclusivo"}
    ],
    currentClientId:"c1",
    staffSession:null,
    audit:[]
  };

  function migrate(state){
    if((state.schemaVersion||1)>=2) return state;
    const business=state.business || seed.businesses[0];
    const businessId=business.id;
    state.schemaVersion=2;
    state.activeBusinessId=businessId;
    state.businesses=[business];
    delete state.business;
    ["staff","clients","requests","audit"].forEach(collection=>{
      state[collection]=(state[collection]||[]).map(item=>({...item,businessId:item.businessId||businessId}));
    });
    return state;
  }
  function load(){
    const raw = localStorage.getItem(KEY);
    if(!raw){ save(seed); return structuredClone(seed); }
    try {
      const state=migrate(JSON.parse(raw));
      save(state);
      return state;
    } catch { save(seed); return structuredClone(seed); }
  }
  function save(state){ localStorage.setItem(KEY,JSON.stringify(state)); }
  function reset(){ localStorage.removeItem(KEY); return load(); }
  function id(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

  function currentBusiness(state=load()){ return state.businesses.find(b=>b.id===state.activeBusinessId) || null; }
  function businessClients(state=load()){ return state.clients.filter(c=>c.businessId===state.activeBusinessId); }
  function businessStaff(state=load()){ return state.staff.filter(s=>s.businessId===state.activeBusinessId); }
  function businessRequests(state=load()){ return state.requests.filter(r=>r.businessId===state.activeBusinessId); }
  function businessAudit(state=load()){ return state.audit.filter(a=>a.businessId===state.activeBusinessId); }
  function currentClient(state=load()){
    return businessClients(state).find(c=>c.id===state.currentClientId) || null;
  }
  function findClient(identifier,state=load()){
    const v=(identifier||"").trim().toLowerCase();
    return businessClients(state).find(c=>(c.phone||"").toLowerCase()===v || (c.email||"").toLowerCase()===v) || null;
  }
  function addClient(data){
    const state=load();
    const duplicate=findClient(data.phone || data.email,state);
    if(duplicate) return {ok:false,error:"Ya existe una cuenta con ese teléfono o correo.",client:duplicate};
    const client={id:id("client"),businessId:state.activeBusinessId,name:data.name,phone:data.phone||"",email:data.email||"",declaredType:data.declaredType,declaredFreq:data.declaredFreq,createdAt:today(),visits:[]};
    state.clients.push(client); state.currentClientId=client.id; save(state); return {ok:true,client};
  }
  function loginClient(identifier){
    const state=load(); const client=findClient(identifier,state);
    if(!client) return {ok:false,error:"No encontramos una cuenta con esos datos."};
    state.currentClientId=client.id; save(state); return {ok:true,client};
  }
  function requestVisit(){
    const state=load(); const client=currentClient(state);
    if(!client) return {ok:false,error:"No hay un cliente activo."};
    const duplicateToday=client.visits.includes(today());
    if(duplicateToday) return {ok:false,error:"Ya tienes una visita registrada hoy."};
    const existing=businessRequests(state).find(r=>r.clientId===client.id && r.status==="pending");
    if(existing) return {ok:false,error:"Ya hay una solicitud pendiente."};
    const req={id:id("req"),businessId:state.activeBusinessId,clientId:client.id,createdAt:nowIso(),status:"pending",approvedBy:null,approvedAt:null};
    state.requests.unshift(req); save(state); return {ok:true,request:req};
  }
  function staffLogin(email,password){
    const state=load(); const staff=businessStaff(state).find(s=>s.email===email && s.password===password);
    if(!staff) return {ok:false,error:"Credenciales incorrectas."};
    state.staffSession=staff.id; save(state); return {ok:true,staff};
  }
  function staffLogout(){ const state=load(); state.staffSession=null; save(state); }
  function loggedStaff(state=load()){ return businessStaff(state).find(s=>s.id===state.staffSession)||null; }
  function decideRequest(requestId,decision){
    const state=load(); const staff=loggedStaff(state);
    if(!staff) return {ok:false,error:"Inicia sesión como personal autorizado."};
    const req=businessRequests(state).find(r=>r.id===requestId);
    if(!req || req.status!=="pending") return {ok:false,error:"La solicitud ya no está disponible."};
    const client=businessClients(state).find(c=>c.id===req.clientId);
    if(decision==="approved"){
      if(client.visits.includes(today())) return {ok:false,error:"Este cliente ya tiene una visita registrada hoy."};
      client.visits.push(today());
    }
    req.status=decision; req.approvedBy=staff.id; req.approvedAt=nowIso();
    state.audit.unshift({id:id("audit"),businessId:state.activeBusinessId,type:"visit_request",decision,requestId:req.id,clientId:req.clientId,staffId:staff.id,at:nowIso()});
    save(state); return {ok:true,client,request:req};
  }
  function avgInterval(client){
    if(!client || client.visits.length<2) return null;
    const d=[...client.visits].sort().map(parseLocalDate);
    const gaps=[]; for(let i=1;i<d.length;i++) gaps.push((d[i]-d[i-1])/MS_PER_DAY);
    return gaps.reduce((a,b)=>a+b,0)/gaps.length;
  }
  function daysSinceLast(client){
    if(!client || !client.visits.length) return null;
    const last=[...client.visits].sort().at(-1);
    return Math.round((parseLocalDate(today())-parseLocalDate(last))/MS_PER_DAY);
  }
  function statusFor(client){
    const n=client.visits.length, avg=avgInterval(client), days=daysSinceLast(client);
    if(n===0) return "Nuevo";
    if(n>=10 && (days===null || days<45)) return "VIP";
    if(avg && days > Math.max(avg*2,60)) return "Inactivo";
    if(avg && days > avg*1.35) return "En riesgo";
    if(n>=4) return "Frecuente";
    return "Activo";
  }
  function nextReward(client,state=load()){
    const n=client.visits.length;
    return state.rewards.find(r=>r.milestone>n) || state.rewards.at(-1);
  }
  return {load,save,reset,currentBusiness,businessClients,businessStaff,businessRequests,businessAudit,currentClient,addClient,loginClient,requestVisit,staffLogin,staffLogout,loggedStaff,decideRequest,avgInterval,daysSinceLast,statusFor,nextReward,today};
})();

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return [...document.querySelectorAll(sel)]; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function toast(msg){
  let el=qs("#toast"); if(!el){ el=document.createElement("div"); el.id="toast"; el.className="toast"; document.body.appendChild(el); }
  el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600);
}

function buildAdviceWhatsAppUrl(context, question){
  const state=NIVAL.load();
  const currentBusiness=NIVAL.currentBusiness(state);
  const phone=(currentBusiness?.advisorWhatsapp || "525539044788").replace(/\D/g,"");
  const business=currentBusiness?.name || "el negocio";
  const message=[
    "Hola, quiero consejo de NIVAL tech.",
    "",
    `Negocio: ${business}`,
    `Contexto: ${context}`,
    "",
    `Pregunta: ${question}`
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
