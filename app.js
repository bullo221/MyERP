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
    '<div class="panel"><div class="panel-heading"><div><h2>Rubrica</h2><p class="muted">'+filtered.length+' contatti · '+contacts.filter(c=>c.kind==="person").length+' persone · '+contacts.filter(c=>c.kind==="company").length+' aziende</p></div></div><input class="field" id="contact-search" type="search" placeholder="Cerca per nome, azienda, email, telefono, ID fiscale o città…" value="'+escapeHtml(contactSearch)+'">'+
    (filtered.length?filtered.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","it")).map(c=>'<article class="contact-card"><div class="contact-main"><div class="contact-avatar">'+(c.kind==="company"?"▦":"♙")+'</div><div class="contact-info"><strong>'+escapeHtml(c.name)+'</strong><div class="muted">'+(c.kind==="company"?"Azienda":"Persona")+(c.company?" · "+escapeHtml(c.company):"")+'</div><div class="contact-details">'+(c.email?'<span>✉ '+escapeHtml(c.email)+'</span>':"")+(c.phone?'<span>☎ '+escapeHtml(c.phone)+'</span>':"")+(c.mobile?'<span>▣ '+escapeHtml(c.mobile)+'</span>':"")+(c.website?'<span>↗ '+escapeHtml(c.website)+'</span>':"")+(c.vat?'<span>ID: '+escapeHtml(c.vat)+'</span>':"")+(c.street||c.zip||c.city||c.country?'<span>⌖ '+[c.street,c.zip,c.city,c.country].filter(Boolean).map(escapeHtml).join(", ")+'</span>':"")+(c.notes?'<span>Note: '+escapeHtml(c.notes)+'</span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary edit-contact" data-id="'+c.id+'">Modifica</button><button class="action danger delete-contact" data-id="'+c.id+'">Elimina</button></div></article>').join(""):'<div class="empty">'+(term?"Nessun contatto corrisponde alla ricerca.":"La rubrica è vuota. Crea la prima scheda dal modulo qui sopra.")+'</div>')+'</div>';
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

let crmSearch = "";
let crmStageFilter = "all";
let editingOpportunityId = null;
const crmStages = {new:"Nuova",qualified:"Qualificata",proposal:"Preventivo",won:"Vinta",lost:"Persa"};
function money(value){
  return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(value)||0);
}
async function renderCRM(records){
  const root=document.getElementById("view");
  const opportunities=records.filter(r=>r.type==="crm");
  const contacts=records.filter(r=>r.type==="contacts");
  const editing=editingOpportunityId===null?null:opportunities.find(r=>r.id===editingOpportunityId);
  const value=key=>editing?(editing[key]??""):"";
  const contactOptions='<option value="">— Nessun contatto collegato —</option>'+contacts.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","it")).map(c=>'<option value="'+c.id+'" '+(String(value("contactId"))===String(c.id)?"selected":"")+'>'+escapeHtml(c.name)+(c.company?" · "+escapeHtml(c.company):"")+'</option>').join("");
  const term=crmSearch.trim().toLocaleLowerCase();
  const filtered=opportunities.filter(o=>(crmStageFilter==="all"||o.stage===crmStageFilter)&&[o.name,o.notes,contacts.find(c=>c.id===o.contactId)?.name].join(" ").toLocaleLowerCase().includes(term));
  const total=opportunities.filter(o=>!["won","lost"].includes(o.stage)).reduce((s,o)=>s+(Number(o.expectedRevenue)||0),0);
  const weighted=opportunities.filter(o=>!["won","lost"].includes(o.stage)).reduce((s,o)=>s+(Number(o.expectedRevenue)||0)*(Number(o.probability)||0)/100,0);
  root.innerHTML=
    '<div class="grid"><div class="metric"><small>Opportunità aperte</small><strong>'+opportunities.filter(o=>!["won","lost"].includes(o.stage)).length+'</strong></div><div class="metric"><small>Valore previsto</small><strong>'+money(total)+'</strong></div><div class="metric"><small>Valore ponderato</small><strong>'+money(weighted)+'</strong></div></div>'+
    '<div class="panel"><div class="panel-heading"><div><h2>'+(editing?"Modifica opportunità":"Nuova opportunità")+'</h2><p class="muted">Registra una trattativa e segui la sua evoluzione commerciale.</p></div></div>'+
    '<form id="crm-form"><div class="form-grid">'+
    '<div class="form-wide"><label class="form-label" for="crm-name">Nome opportunità *</label><input class="field" id="crm-name" maxlength="180" required value="'+escapeHtml(value("name"))+'" placeholder="Es. Fornitura annuale cliente"></div>'+
    '<div><label class="form-label" for="crm-contact">Cliente / contatto</label><select class="field" id="crm-contact">'+contactOptions+'</select></div>'+
    '<div><label class="form-label" for="crm-stage">Fase</label><select class="field" id="crm-stage">'+Object.entries(crmStages).map(([k,v])=>'<option value="'+k+'" '+(value("stage")===(k)||(!value("stage")&&k==="new")?"selected":"")+'>'+v+'</option>').join("")+'</select></div>'+
    '<div><label class="form-label" for="crm-revenue">Valore previsto (€)</label><input class="field" id="crm-revenue" type="number" min="0" step="0.01" value="'+escapeHtml(value("expectedRevenue"))+'" placeholder="0"></div>'+
    '<div><label class="form-label" for="crm-probability">Probabilità di chiusura (%)</label><input class="field" id="crm-probability" type="number" min="0" max="100" step="1" value="'+escapeHtml(value("probability")||"0")+'"></div>'+
    '<div><label class="form-label" for="crm-close">Chiusura prevista</label><input class="field" id="crm-close" type="date" value="'+escapeHtml(value("expectedClose"))+'"></div>'+
    '<div class="form-wide"><label class="form-label" for="crm-notes">Note e prossima attività</label><textarea class="field" id="crm-notes" rows="3" maxlength="1500" placeholder="Telefonata, invio preventivo, prossimo incontro…">'+escapeHtml(value("notes"))+'</textarea></div>'+
    '</div><div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Crea opportunità")+'</button>'+(editing?'<button class="action secondary" type="button" id="crm-cancel">Annulla</button>':"")+'</div></form></div>'+
    '<div class="panel"><div class="panel-heading"><div><h2>Pipeline commerciale</h2><p class="muted">'+filtered.length+' opportunità visualizzate</p></div></div>'+
    '<div class="form-grid"><div><label class="form-label" for="crm-search">Cerca</label><input class="field" id="crm-search" type="search" placeholder="Opportunità o cliente…" value="'+escapeHtml(crmSearch)+'"></div><div><label class="form-label" for="crm-filter">Filtra per fase</label><select class="field" id="crm-filter"><option value="all">Tutte le fasi</option>'+Object.entries(crmStages).map(([k,v])=>'<option value="'+k+'" '+(crmStageFilter===k?"selected":"")+'>'+v+'</option>').join("")+'</select></div></div>'+
    (filtered.length?filtered.slice().sort((a,b)=>(a.expectedClose||"9999").localeCompare(b.expectedClose||"9999")).map(o=>{const c=contacts.find(x=>x.id===o.contactId);return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(o.name)+'</strong><div class="muted">'+escapeHtml(crmStages[o.stage]||"Nuova")+(c?" · "+escapeHtml(c.name):" · Nessun cliente collegato")+'</div><div class="contact-details"><span>Valore: '+money(o.expectedRevenue)+'</span><span>Probabilità: '+(Number(o.probability)||0)+'%</span>'+(o.expectedClose?'<span>Chiusura prevista: '+escapeHtml(o.expectedClose)+'</span>':"")+(o.notes?'<span>Note: '+escapeHtml(o.notes)+'</span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary edit-opportunity" data-id="'+o.id+'">Modifica</button><button class="action danger delete-opportunity" data-id="'+o.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">'+(term||crmStageFilter!=="all"?"Nessuna opportunità corrisponde ai filtri.":"La pipeline è vuota. Crea la prima opportunità dal modulo qui sopra.")+'</div>')+'</div>';
  document.getElementById("crm-form").onsubmit=async e=>{
    e.preventDefault();
    const name=document.getElementById("crm-name").value.trim();
    const probability=Number(document.getElementById("crm-probability").value)||0;
    const expectedRevenue=Number(document.getElementById("crm-revenue").value)||0;
    if(!name){alert("Inserisci il nome dell’opportunità.");return}
    if(probability<0||probability>100||expectedRevenue<0){alert("Controlla valore e probabilità.");return}
    const opportunity={type:"crm",name,contactId:document.getElementById("crm-contact").value?Number(document.getElementById("crm-contact").value):null,stage:document.getElementById("crm-stage").value,expectedRevenue,probability,expectedClose:document.getElementById("crm-close").value,notes:document.getElementById("crm-notes").value.trim()};
    if(editing){opportunity.id=editing.id;opportunity.createdAt=editing.createdAt;opportunity.updatedAt=new Date().toISOString();await updateRecord(opportunity)}else{await addRecord(opportunity)}
    editingOpportunityId=null;crmSearch="";crmStageFilter="all";await render();
  };
  const cancel=document.getElementById("crm-cancel");
  if(cancel)cancel.onclick=()=>{editingOpportunityId=null;render()};
  const search=document.getElementById("crm-search");
  search.addEventListener("input",e=>{crmSearch=e.target.value;const pos=e.target.selectionStart;render().then(()=>{const input=document.getElementById("crm-search");input.focus();input.setSelectionRange(pos,pos)})});
  document.getElementById("crm-filter").onchange=e=>{crmStageFilter=e.target.value;render()};
  root.querySelectorAll(".edit-opportunity").forEach(b=>b.onclick=()=>{editingOpportunityId=Number(b.dataset.id);render()});
  root.querySelectorAll(".delete-opportunity").forEach(b=>b.onclick=async()=>{if(confirm("Eliminare definitivamente questa opportunità?")){await deleteRecord(Number(b.dataset.id));await render()}});
}


let salesSearch="";
let salesStatusFilter="all";
let editingSaleId=null;
let saleDraftLines=[];
const saleStatuses={draft:"Bozza",sent:"Inviato",confirmed:"Confermato",delivered:"Consegnato",cancelled:"Annullato"};
function saleNumber(value){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(value)||0)}
function saleTotals(lines){return lines.reduce((sum,line)=>{const qty=Math.max(0,Number(line.quantity)||0),price=Math.max(0,Number(line.price)||0),discount=Math.min(100,Math.max(0,Number(line.discount)||0));return sum+qty*price*(1-discount/100)},0)}
function renderSaleLines(){
  const host=document.getElementById("sale-lines");
  if(!host)return;
  host.innerHTML=saleDraftLines.map((line,i)=>'<div class="form-grid sale-line" data-line="'+i+'"><div class="form-wide"><label class="form-label">Prodotto / servizio</label><input class="field sale-description" maxlength="160" value="'+escapeHtml(line.description)+'" placeholder="Descrizione articolo"></div><div><label class="form-label">Quantità</label><input class="field sale-quantity" type="number" min="0.01" step="0.01" value="'+escapeHtml(line.quantity)+'"></div><div><label class="form-label">Prezzo unitario (€)</label><input class="field sale-price" type="number" min="0" step="0.01" value="'+escapeHtml(line.price)+'"></div><div><label class="form-label">Sconto (%)</label><input class="field sale-discount" type="number" min="0" max="100" step="0.1" value="'+escapeHtml(line.discount)+'"></div><div><label class="form-label">Totale riga</label><strong class="sale-line-total">'+saleNumber((Number(line.quantity)||0)*(Number(line.price)||0)*(1-(Number(line.discount)||0)/100))+'</strong><button class="action danger sale-remove" type="button" data-index="'+i+'">Rimuovi riga</button></div></div>').join("");
  host.querySelectorAll(".sale-line").forEach((row,i)=>{
    ["description","quantity","price","discount"].forEach(key=>{const cls={description:".sale-description",quantity:".sale-quantity",price:".sale-price",discount:".sale-discount"}[key];row.querySelector(cls).oninput=e=>{saleDraftLines[i][key]=e.target.value;const total=(Number(saleDraftLines[i].quantity)||0)*(Number(saleDraftLines[i].price)||0)*(1-(Number(saleDraftLines[i].discount)||0)/100);row.querySelector(".sale-line-total").textContent=saleNumber(total);document.getElementById("sale-grand-total").textContent=saleNumber(saleTotals(saleDraftLines))}});
  });
  host.querySelectorAll(".sale-remove").forEach(b=>b.onclick=()=>{saleDraftLines.splice(Number(b.dataset.index),1);renderSaleLines();document.getElementById("sale-grand-total").textContent=saleNumber(saleTotals(saleDraftLines))});
  document.getElementById("sale-grand-total").textContent=saleNumber(saleTotals(saleDraftLines));
}
async function renderSales(records){
  const root=document.getElementById("view");
  const sales=records.filter(r=>r.type==="sales");
  const contacts=records.filter(r=>r.type==="contacts");
  const editing=editingSaleId===null?null:sales.find(s=>s.id===editingSaleId);
  const val=k=>editing?(editing[k]??""):"";
  if(editing)saleDraftLines=(editing.lines||[]).map(x=>({...x}));else if(!saleDraftLines.length)saleDraftLines=[{description:"",quantity:1,price:0,discount:0}];
  const contactOptions='<option value="">— Seleziona cliente —</option>'+contacts.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","it")).map(c=>'<option value="'+c.id+'" '+(String(val("contactId"))===String(c.id)?"selected":"")+'>'+escapeHtml(c.name)+(c.company?" · "+escapeHtml(c.company):"")+'</option>').join("");
  const term=salesSearch.trim().toLocaleLowerCase();
  const filtered=sales.filter(s=>(salesStatusFilter==="all"||s.status===salesStatusFilter)&&[s.name,s.number,contacts.find(c=>c.id===s.contactId)?.name].join(" ").toLocaleLowerCase().includes(term));
  const total=sales.reduce((n,s)=>n+(Number(s.total)||0),0);
  root.innerHTML='<div class="grid"><div class="metric"><small>Documenti vendita</small><strong>'+sales.length+'</strong></div><div class="metric"><small>Valore complessivo</small><strong>'+saleNumber(total)+'</strong></div><div class="metric"><small>Confermati</small><strong>'+sales.filter(s=>s.status==="confirmed").length+'</strong></div></div>'+
  '<div class="panel"><div class="panel-heading"><div><h2>'+(editing?"Modifica documento":"Nuovo preventivo / ordine")+'</h2><p class="muted">Crea un preventivo e aggiornane lo stato fino alla conferma o consegna.</p></div></div>'+
  '<form id="sales-form"><div class="form-grid"><div class="form-wide"><label class="form-label" for="sale-title">Oggetto / riferimento *</label><input class="field" id="sale-title" required maxlength="180" value="'+escapeHtml(val("name"))+'" placeholder="Es. Fornitura materiali"></div>'+
  '<div><label class="form-label" for="sale-customer">Cliente</label><select class="field" id="sale-customer">'+contactOptions+'</select></div>'+
  '<div><label class="form-label" for="sale-status">Stato</label><select class="field" id="sale-status">'+Object.entries(saleStatuses).map(([k,v])=>'<option value="'+k+'" '+(val("status")===(k)||(!val("status")&&k==="draft")?"selected":"")+'>'+v+'</option>').join("")+'</select></div>'+
  '<div><label class="form-label" for="sale-date">Data documento</label><input class="field" type="date" id="sale-date" value="'+escapeHtml(val("date")||new Date().toISOString().slice(0,10))+'"></div>'+
  '<div><label class="form-label" for="sale-validity">Valido fino al</label><input class="field" type="date" id="sale-validity" value="'+escapeHtml(val("validUntil"))+'"></div>'+
  '<div class="form-wide"><h3>Righe documento</h3><div id="sale-lines"></div><button class="action secondary" type="button" id="sale-add-line">Aggiungi riga</button><p>Totale documento: <strong id="sale-grand-total">'+saleNumber(saleTotals(saleDraftLines))+'</strong></p></div>'+
  '<div class="form-wide"><label class="form-label" for="sale-notes">Note</label><textarea class="field" id="sale-notes" rows="3" maxlength="1500">'+escapeHtml(val("notes"))+'</textarea></div></div>'+
  '<div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Salva documento")+'</button>'+(editing?'<button class="action secondary" type="button" id="sale-cancel">Annulla</button>':"")+'</div></form></div>'+
  '<div class="panel"><div class="panel-heading"><div><h2>Preventivi e ordini</h2><p class="muted">'+filtered.length+' documenti visualizzati</p></div></div><div class="form-grid"><div><label class="form-label" for="sales-search">Cerca</label><input class="field" id="sales-search" type="search" value="'+escapeHtml(salesSearch)+'" placeholder="Numero, oggetto o cliente"></div><div><label class="form-label" for="sales-filter">Stato</label><select class="field" id="sales-filter"><option value="all">Tutti gli stati</option>'+Object.entries(saleStatuses).map(([k,v])=>'<option value="'+k+'" '+(salesStatusFilter===k?"selected":"")+'>'+v+'</option>').join("")+'</select></div></div>'+
  (filtered.length?filtered.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(s=>{const c=contacts.find(x=>x.id===s.contactId);return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(s.number||"Preventivo")+' · '+escapeHtml(s.name)+'</strong><div class="muted">'+escapeHtml(saleStatuses[s.status]||"Bozza")+(c?" · "+escapeHtml(c.name):" · Cliente non specificato")+'</div><div class="contact-details"><span>Data: '+escapeHtml(s.date||"—")+'</span><span>Totale: '+saleNumber(s.total)+'</span>'+(s.validUntil?'<span>Valido fino al: '+escapeHtml(s.validUntil)+'</span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary edit-sale" data-id="'+s.id+'">Modifica</button><button class="action danger delete-sale" data-id="'+s.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessun documento vendita trovato.</div>')+'</div>';
  renderSaleLines();
  document.getElementById("sale-add-line").onclick=()=>{saleDraftLines.push({description:"",quantity:1,price:0,discount:0});renderSaleLines()};
  document.getElementById("sales-form").onsubmit=async e=>{
    e.preventDefault();
    const name=document.getElementById("sale-title").value.trim();
    const lines=saleDraftLines.map(x=>({description:String(x.description||"").trim(),quantity:Number(x.quantity)||0,price:Number(x.price)||0,discount:Number(x.discount)||0}));
    if(!name||!lines.length||lines.some(x=>!x.description||x.quantity<=0||x.price<0||x.discount<0||x.discount>100)){alert("Completa le righe: descrizione, quantità positiva, prezzo e sconto tra 0 e 100%.");return}
    const sale={type:"sales",name,contactId:document.getElementById("sale-customer").value?Number(document.getElementById("sale-customer").value):null,status:document.getElementById("sale-status").value,date:document.getElementById("sale-date").value,validUntil:document.getElementById("sale-validity").value,lines,total:saleTotals(lines),notes:document.getElementById("sale-notes").value.trim()};
    if(editing){sale.id=editing.id;sale.number=editing.number;sale.createdAt=editing.createdAt;sale.updatedAt=new Date().toISOString();await updateRecord(sale)}
    else{const id=await addRecord(sale);sale.id=id;sale.number="PREV-"+String(id).padStart(5,"0");await updateRecord(sale)}
    editingSaleId=null;saleDraftLines=[];salesSearch="";salesStatusFilter="all";await render();
  };
  const cancel=document.getElementById("sale-cancel");if(cancel)cancel.onclick=()=>{editingSaleId=null;saleDraftLines=[];render()};
  document.getElementById("sales-search").oninput=e=>{salesSearch=e.target.value;const pos=e.target.selectionStart;render().then(()=>{const el=document.getElementById("sales-search");el.focus();el.setSelectionRange(pos,pos)})};
  document.getElementById("sales-filter").onchange=e=>{salesStatusFilter=e.target.value;render()};
  root.querySelectorAll(".edit-sale").forEach(b=>b.onclick=()=>{editingSaleId=Number(b.dataset.id);saleDraftLines=[];render()});
  root.querySelectorAll(".delete-sale").forEach(b=>b.onclick=async()=>{if(confirm("Eliminare definitivamente questo documento di vendita?")){await deleteRecord(Number(b.dataset.id));render()}});
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
  if(currentView==="crm"){await renderCRM(records);return}
  if(currentView==="sales"){await renderSales(records);return}
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