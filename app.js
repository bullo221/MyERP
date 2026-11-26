const DB_NAME = "myerp-local";
const DB_VERSION = 1;
const STORE = "records";
const labels = {dashboard:"Panoramica",crm:"CRM",contacts:"Contatti",sales:"Vendite",purchases:"Acquisti",inventory:"Magazzino",invoices:"Fatturazione",activities:"Attività",documents:"Documenti",backup:"Backup e ripristino"};
let db;
let currentView = "dashboard";
let contactSearch = "";
let editingContactId = null;

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
function updateRecord(record){
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,"readwrite").objectStore(STORE).put(record);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function deleteRecord(id){
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);
    request.onsuccess=()=>resolve();
    request.onerror=()=>reject(request.error);
  });
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function setView(view){
  currentView=view;
  editingContactId=null;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.getElementById("page-title").textContent=labels[view]||"MyERP";
  render();
}
function field(label,id,value,placeholder,type){
  return '<label class="form-label" for="'+id+'">'+label+'</label><input class="field" id="'+id+'" type="'+(type||"text")+'" maxlength="180" value="'+escapeHtml(value||"")+'" placeholder="'+(placeholder||"")+'">';
}
async function renderContacts(records){
  const root=document.getElementById("view");
  const contacts=records.filter(r=>r.type==="contacts");
  const term=contactSearch.trim().toLocaleLowerCase();
  const filtered=contacts.filter(c=>[c.name,c.company,c.email,c.phone,c.mobile,c.city,c.vat,c.notes].join(" ").toLocaleLowerCase().includes(term));
  const editing=editingContactId===null?null:contacts.find(c=>c.id===editingContactId);
  const value=(key)=>editing?editing[key]||"":"";
  root.innerHTML=
    '<div class="panel"><div class="panel-heading"><div><h2>'+(editing?"Modifier le contact":"Nouvelle fiche contact")+'</h2><p class="muted">Créez une fiche pour une personne ou une entreprise.</p></div></div>'+
    '<form id="contact-form"><div class="form-grid">'+
    '<div><label class="form-label" for="contact-kind">Type de contact</label><select class="field" id="contact-kind"><option value="person" '+(value("kind")!=="company"?"selected":"")+'>Personne</option><option value="company" '+(value("kind")==="company"?"selected":"")+'>Entreprise</option></select></div>'+
    '<div>'+field("Nome / denominazione","contact-name",value("name"),"Nome completo o ragione sociale")+'</div>'+
    '<div>'+field("Azienda","contact-company",value("company"),"Azienda di appartenenza")+'</div>'+
    '<div>'+field("Email","contact-email",value("email"),"nome@azienda.it","email")+'</div>'+
    '<div>'+field("Telefono","contact-phone",value("phone"),"+39…","tel")+'</div>'+
    '<div>'+field("Cellulare","contact-mobile",value("mobile"),"+39…","tel")+'</div>'+
    '<div>'+field("Sito web","contact-website",value("website"),"https://…","url")+'</div>'+
    '<div>'+field("Partita IVA / ID fiscale","contact-vat",value("vat"),"Identificativo fiscale")+'</div>'+
    '<div class="form-wide">'+field("Indirizzo","contact-street",value("street"),"Via e numero")+'</div>'+
    '<div>'+field("CAP","contact-zip",value("zip"),"CAP")+'</div>'+
    '<div>'+field("Città","contact-city",value("city"),"Città")+'</div>'+
    '<div>'+field("Paese","contact-country",value("country"),"Paese")+'</div>'+
    '<div class="form-wide"><label class="form-label" for="contact-notes">Note</label><textarea class="field" id="contact-notes" rows="3" maxlength="1000" placeholder="Annotazioni sul contatto">'+escapeHtml(value("notes"))+'</textarea></div>'+
    '</div><div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Crea contatto")+'</button>'+(editing?'<button class="action secondary" type="button" id="cancel-edit">Annulla</button>':"")+'</div></form></div>'+
    '<div class="panel"><div class="panel-heading"><div><h2>Rubrica</h2><p class="muted">'+filtered.length+' contatti</p></div></div><input class="field" id="contact-search" type="search" placeholder="Cerca per nome, azienda, email o città…" value="'+escapeHtml(contactSearch)+'">'+
    (filtered.length?filtered.map(c=>'<article class="contact-card"><div class="contact-main"><div class="contact-avatar">'+(c.kind==="company"?"▦":"♙")+'</div><div class="contact-info"><strong>'+escapeHtml(c.name)+'</strong><div class="muted">'+(c.kind==="company"?"Azienda":"Persona")+(c.company?" · "+escapeHtml(c.company):"")+'</div><div class="contact-details">'+(c.email?'<span>✉ '+escapeHtml(c.email)+'</span>':"")+(c.phone?'<span>☎ '+escapeHtml(c.phone)+'</span>':"")+(c.city?'<span>⌖ '+escapeHtml(c.city)+(c.country?", "+escapeHtml(c.country):"")+'</span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary edit-contact" data-id="'+c.id+'">Modifica</button><button class="action danger delete-contact" data-id="'+c.id+'">Elimina</button></div></article>').join(""):'<div class="empty">'+(term?"Nessun contatto corrisponde alla ricerca.":"La rubrica è vuota. Crea la prima scheda dal modulo qui sopra.")+'</div>')+'</div>';
  document.getElementById("contact-search").addEventListener("input",e=>{contactSearch=e.target.value;const pos=e.target.selectionStart;render().then(()=>{const input=document.getElementById("contact-search");input.focus();input.setSelectionRange(pos,pos)})});
  document.getElementById("contact-form").onsubmit=async e=>{
    e.preventDefault();
    const name=document.getElementById("contact-name").value.trim();
    if(!name){alert("Inserisci il nome o la denominazione.");return}
    const contact={type:"contacts",kind:document.getElementById("contact-kind").value,name,company:document.getElementById("contact-company").value.trim(),email:document.getElementById("contact-email").value.trim(),phone:document.getElementById("contact-phone").value.trim(),mobile:document.getElementById("contact-mobile").value.trim(),website:document.getElementById("contact-website").value.trim(),vat:document.getElementById("contact-vat").value.trim(),street:document.getElementById("contact-street").value.trim(),zip:document.getElementById("contact-zip").value.trim(),city:document.getElementById("contact-city").value.trim(),country:document.getElementById("contact-country").value.trim(),notes:document.getElementById("contact-notes").value.trim()};
    if(editing){contact.id=editing.id;contact.createdAt=editing.createdAt;contact.updatedAt=new Date().toISOString();await updateRecord(contact)}else{await addRecord(contact)}
    editingContactId=null;contactSearch="";await render();
  };
  const cancel=document.getElementById("cancel-edit");
  if(cancel)cancel.onclick=()=>{editingContactId=null;render()};
  root.querySelectorAll(".edit-contact").forEach(button=>button.onclick=()=>{editingContactId=Number(button.dataset.id);render()});
  root.querySelectorAll(".delete-contact").forEach(button=>button.onclick=async()=>{if(confirm("Eliminare definitivamente questo contatto da questo dispositivo?")){await deleteRecord(Number(button.dataset.id));await render()}});
}
async function render(){
  const root=document.getElementById("view");
  const records=await allRecords();
  if(currentView==="dashboard"){
    root.innerHTML='<div class="grid"><div class="metric"><small>Contatti</small><strong>'+records.filter(r=>r.type==="contacts").length+'</strong></div><div class="metric"><small>Opportunità CRM</small><strong>'+records.filter(r=>r.type==="crm").length+'</strong></div><div class="metric"><small>Elementi archiviati</small><strong>'+records.length+'</strong></div></div><div class="panel"><h2>Panoramica</h2><p class="muted">Benvenuto in MyERP. Questa area diventerà il centro operativo del gestionale, con riepiloghi, attività e indicatori dei diversi moduli.</p><div class="empty">Seleziona un’applicazione dal menu. I dati vengono conservati nell’archivio locale di Safari.</div></div>';
    return;
  }
  if(currentView==="backup"){
    root.innerHTML='<div class="panel"><h2>Backup dei dati</h2><p class="muted">Esporta un file JSON da conservare in File, preferibilmente in iCloud Drive. Per trasferire i dati sull’iPhone, importa quel file dall’altro dispositivo.</p><div class="toolbar"><button class="action" id="export">Esporta backup</button><label class="action secondary" for="import-file">Importa backup</label><input id="import-file" type="file" accept="application/json" hidden></div><p class="muted">L’importazione aggiunge i dati al dispositivo: non è una sincronizzazione automatica.</p></div>';
    document.getElementById("export").onclick=()=>{const blob=new Blob([JSON.stringify({app:"MyERP",version:1,exportedAt:new Date().toISOString(),records},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="myerp-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url)};
    document.getElementById("import-file").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.app!=="MyERP"||!Array.isArray(data.records))throw Error("File non valido");for(const r of data.records){const {id,...record}=r;await addRecord(record)}alert("Backup importato.");render()}catch(err){alert("Impossibile importare: "+err.message)}};
    return;
  }
  if(currentView==="contacts"){await renderContacts(records);return}
  const moduleRecords=records.filter(r=>r.type===currentView);
  const descriptions={crm:"Gestione delle opportunità e del rapporto con i potenziali clienti.",sales:"Preventivi, ordini cliente e flusso delle vendite.",purchases:"Richieste, ordini fornitore e acquisti.",inventory:"Prodotti, giacenze e movimenti di magazzino.",invoices:"Fatture clienti e fornitori, con stato dei pagamenti.",activities:"Promemoria, appuntamenti e attività da completare.",documents:"Archivio dei documenti collegati alle attività aziendali."};
  root.innerHTML='<div class="panel"><h2>'+labels[currentView]+'</h2><p class="muted">'+(descriptions[currentView]||"Sezione del gestionale.")+'</p><form id="new-record"><label class="muted" for="record-name">Nome o descrizione</label><input class="field" id="record-name" maxlength="120" required placeholder="Inserisci un nome o una descrizione"><label class="muted" for="record-notes">Note (facoltative)</label><input class="field" id="record-notes" maxlength="500" placeholder="Aggiungi dettagli"><button class="action" type="submit">Crea</button></form></div><div class="panel"><h2>Elementi</h2>'+(moduleRecords.length?moduleRecords.map(r=>'<div class="record"><strong>'+escapeHtml(r.name)+'</strong>'+(r.notes?'<div class="muted">'+escapeHtml(r.notes)+'</div>':"")+'</div>').join(""):'<div class="empty">Nessun elemento presente. Le funzioni specifiche di questo modulo verranno sviluppate nelle prossime fasi.</div>')+'</div>';
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