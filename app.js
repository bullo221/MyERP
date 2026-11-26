const DB_NAME = "myerp-local";
const DB_VERSION = 1;
const STORE = "records";
const labels = {dashboard:"Panoramica",crm:"CRM",contacts:"Contatti",sales:"Vendite",purchases:"Acquisti",inventory:"Magazzino",invoices:"Fatturazione",activities:"Attività",documents:"Documenti",backup:"Backup e ripristino"};
let db;
let currentView = "dashboard";

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true})};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function allRecords(){
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,"readonly").objectStore(STORE).getAll();
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function addRecord(record){
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,"readwrite").objectStore(STORE).add({...record,createdAt:new Date().toISOString()});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setView(view){
  currentView=view;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.getElementById("page-title").textContent=labels[view]||"MyERP";
  render();
}
async function render(){
  const root=document.getElementById("view");
  const records=await allRecords();
  if(currentView==="dashboard"){
    root.innerHTML=`<div class="grid"><div class="metric"><small>Contatti</small><strong>${records.filter(r=>r.type==="contacts").length}</strong></div><div class="metric"><small>Opportunità CRM</small><strong>${records.filter(r=>r.type==="crm").length}</strong></div><div class="metric"><small>Elementi archiviati</small><strong>${records.length}</strong></div></div><div class="panel"><h2>Panoramica</h2><p class="muted">Benvenuto in MyERP. Questa area diventerà il centro operativo del gestionale, con riepiloghi, attività e indicatori dei diversi moduli.</p><div class="empty">Seleziona un'applicazione dal menu. I dati vengono conservati nell'archivio locale di Safari.</div></div>`;
    return;
  }
  if(currentView==="backup"){
    root.innerHTML=`<div class="panel"><h2>Backup dei dati</h2><p class="muted">Esporta un file JSON da conservare in File, preferibilmente in iCloud Drive. Per trasferire i dati sull'iPhone, importa quel file dall'altro dispositivo.</p><div class="toolbar"><button class="action" id="export">Esporta backup</button><label class="action secondary" for="import-file">Importa backup</label><input id="import-file" type="file" accept="application/json" hidden></div><p class="muted">L'importazione aggiunge i dati al dispositivo: non è una sincronizzazione automatica.</p></div>`;
    document.getElementById("export").onclick=()=>{const blob=new Blob([JSON.stringify({app:"MyERP",version:1,exportedAt:new Date().toISOString(),records},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="myerp-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url)};
    document.getElementById("import-file").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.app!=="MyERP"||!Array.isArray(data.records))throw Error("File non valido");for(const r of data.records){const {id,...record}=r;await addRecord(record)}alert("Backup importato.");render()}catch(err){alert("Impossibile importare: "+err.message)}};
    return;
  }
  const moduleRecords=records.filter(r=>r.type===currentView);
  const descriptions={crm:"Gestione delle opportunità e del rapporto con i potenziali clienti.",contacts:"Anagrafica di clienti, fornitori e altre aziende o persone.",sales:"Preventivi, ordini cliente e flusso delle vendite.",purchases:"Richieste, ordini fornitore e acquisti.",inventory:"Prodotti, giacenze e movimenti di magazzino.",invoices:"Fatture clienti e fornitori, con stato dei pagamenti.",activities:"Promemoria, appuntamenti e attività da completare.",documents:"Archivio dei documenti collegati alle attività aziendali."};
  root.innerHTML=`<div class="panel"><h2>${labels[currentView]}</h2><p class="muted">${descriptions[currentView]||"Sezione del gestionale."}</p><form id="new-record"><label class="muted" for="record-name">Nome o descrizione</label><input class="field" id="record-name" maxlength="120" required placeholder="Inserisci un nome o una descrizione"><label class="muted" for="record-notes">Note (facoltative)</label><input class="field" id="record-notes" maxlength="500" placeholder="Aggiungi dettagli"><button class="action" type="submit">Crea</button></form></div><div class="panel"><h2>Elementi</h2>${moduleRecords.length?moduleRecords.map(r=>`<div class="record"><strong>${escapeHtml(r.name)}</strong>${r.notes?`<div class="muted">${escapeHtml(r.notes)}</div>`:""}</div>`).join(""):'<div class="empty">Nessun elemento presente. I registri specifici di questo modulo verranno sviluppati nella prossima fase.</div>'}</div>`;
  document.getElementById("new-record").onsubmit=async e=>{e.preventDefault();const name=document.getElementById("record-name").value.trim();if(!name)return;await addRecord({type:currentView,name,notes:document.getElementById("record-notes").value.trim()});render()};
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
(async()=>{
  try{
    db=await openDatabase();
    document.getElementById("connection").textContent="Archivio locale pronto";
    await render();
    if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").catch(()=>{document.getElementById("connection").textContent="Cache offline da configurare"})}
  }catch(error){
    document.getElementById("connection").textContent="Archivio non disponibile";
    document.getElementById("view").innerHTML='<div class="empty">Safari non ha potuto inizializzare l’archivio locale. Ricarica la pagina o prova in modalità navigazione normale.</div>';
  }
})();