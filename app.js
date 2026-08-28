const NIVAL = (() => {
  const KEY = "nival_tech_demo_v4";
  const today = () => new Date().toISOString().slice(0,10);
  const nowIso = () => new Date().toISOString();

  const seed = {
    business: {
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
    },
    staff: [
      {id:"emp-diego",name:"Diego",email:"staff@nival.demo",password:"demo1234",role:"Barbero"},
      {id:"emp-owner",name:"Gerente Demo",email:"owner@nival.demo",password:"nival2026",role:"Dueño"}
    ],
    clients: [
      {id:"c1",name:"Carlos Martínez",phone:"5511111111",email:"carlos@demo.mx",declaredType:"Recurrente",declaredFreq:"Cada 3 semanas",createdAt:"2026-05-01",visits:["2026-05-02","2026-05-23","2026-06-13"]},
      {id:"c2",name:"Miguel Herrera",phone:"5522222222",email:"miguel@demo.mx",declaredType:"Recurrente",declaredFreq:"Cada 3 semanas",createdAt:"2026-03-15",visits:["2026-03-15","2026-04-05","2026-04-26","2026-05-18","2026-06-08","2026-07-01"]},
      {id:"c3",name:"Javier Ortega",phone:"5533333333",email:"javier@demo.mx",declaredType:"Ocasional",declaredFreq:"Cada mes",createdAt:"2026-01-10",visits:["2026-01-10","2026-02-16","2026-03-22","2026-05-01"]},
      {id:"c4",name:"Roberto Silva",phone:"5544444444",email:"roberto@demo.mx",declaredType:"Recurrente",declaredFreq:"Cada 2 semanas",createdAt:"2026-02-01",visits:["2026-02-01","2026-02-16","2026-03-02","2026-03-16","2026-03-30","2026-04-13","2026-04-27","2026-05-11","2026-05-25","2026-06-08","2026-06-22","2026-08-20"]}
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

  function load(){
    const raw = localStorage.getItem(KEY);
    if(!raw){ save(seed); return structuredClone(seed); }
    try { return JSON.parse(raw); } catch { save(seed); return structuredClone(seed); }
  }
  function save(state){ localStorage.setItem(KEY,JSON.stringify(state)); }
  function reset(){ localStorage.removeItem(KEY); return load(); }
  function id(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

  function currentClient(state=load()){ return state.clients.find(c=>c.id===state.currentClientId) || null; }
  function findClient(identifier,state=load()){
    const v=(identifier||"").trim().toLowerCase();
    return state.clients.find(c=>(c.phone||"").toLowerCase()===v || (c.email||"").toLowerCase()===v) || null;
  }
  function addClient(data){
    const state=load();
    const duplicate=findClient(data.phone || data.email,state);
    if(duplicate) return {ok:false,error:"Ya existe una cuenta con ese teléfono o correo.",client:duplicate};
    const client={id:id("client"),name:data.name,phone:data.phone||"",email:data.email||"",declaredType:data.declaredType,declaredFreq:data.declaredFreq,createdAt:today(),visits:[]};
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
    const existing=state.requests.find(r=>r.clientId===client.id && r.status==="pending");
    if(existing) return {ok:false,error:"Ya hay una solicitud pendiente."};
    const req={id:id("req"),clientId:client.id,createdAt:nowIso(),status:"pending",approvedBy:null,approvedAt:null};
    state.requests.unshift(req); save(state); return {ok:true,request:req};
  }
  function staffLogin(email,password){
    const state=load(); const staff=state.staff.find(s=>s.email===email && s.password===password);
    if(!staff) return {ok:false,error:"Credenciales incorrectas."};
    state.staffSession=staff.id; save(state); return {ok:true,staff};
  }
  function staffLogout(){ const state=load(); state.staffSession=null; save(state); }
  function loggedStaff(state=load()){ return state.staff.find(s=>s.id===state.staffSession)||null; }
  function decideRequest(requestId,decision){
    const state=load(); const staff=loggedStaff(state);
    if(!staff) return {ok:false,error:"Inicia sesión como personal autorizado."};
    const req=state.requests.find(r=>r.id===requestId);
    if(!req || req.status!=="pending") return {ok:false,error:"La solicitud ya no está disponible."};
    const client=state.clients.find(c=>c.id===req.clientId);
    if(decision==="approved"){
      if(client.visits.includes(today())) return {ok:false,error:"Este cliente ya tiene una visita registrada hoy."};
      client.visits.push(today());
    }
    req.status=decision; req.approvedBy=staff.id; req.approvedAt=nowIso();
    state.audit.unshift({id:id("audit"),type:"visit_request",decision,requestId:req.id,clientId:req.clientId,staffId:staff.id,at:nowIso()});
    save(state); return {ok:true,client,request:req};
  }
  function avgInterval(client){
    if(!client || client.visits.length<2) return null;
    const d=[...client.visits].sort().map(x=>new Date(x+"T12:00:00"));
    const gaps=[]; for(let i=1;i<d.length;i++) gaps.push((d[i]-d[i-1])/(1000*60*60*24));
    return gaps.reduce((a,b)=>a+b,0)/gaps.length;
  }
  function daysSinceLast(client){
    if(!client || !client.visits.length) return null;
    const last=[...client.visits].sort().at(-1);
    return Math.floor((new Date()-new Date(last+"T12:00:00"))/(1000*60*60*24));
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
  return {load,save,reset,currentClient,addClient,loginClient,requestVisit,staffLogin,staffLogout,loggedStaff,decideRequest,avgInterval,daysSinceLast,statusFor,nextReward,today};
})();

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return [...document.querySelectorAll(sel)]; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function toast(msg){
  let el=qs("#toast"); if(!el){ el=document.createElement("div"); el.id="toast"; el.className="toast"; document.body.appendChild(el); }
  el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600);
}

function openAdviceWhatsApp(context, question){
  const state=NIVAL.load();
  const phone=(state.business?.advisorWhatsapp||"").replace(/\D/g,"");
  const business=state.business?.name||"el negocio";
  const message=[
    "Hola, quiero consejo de NIVAL tech.",
    "",
    `Negocio: ${business}`,
    `Contexto: ${context}`,
    "",
    `Pregunta: ${question}`
  ].join("\n");
  if(!phone){
    toast("Falta configurar el WhatsApp del asesor en app.js → advisorWhatsapp.");
    return;
  }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
}
