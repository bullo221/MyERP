const DB_NAME = "myerp-local";
const DB_VERSION = 1;
const STORE = "records";
const labels = {dashboard:"Panoramica",crm:"CRM",contacts:"Contatti",sales:"Vendite",purchases:"Acquisti",inventory:"Magazzino",invoices:"Fatturazione",activities:"Attività",documents:"Documenti",cashbook:"Prima nota",reports:"Report",backup:"Backup e ripristino"};
let db;
let cashBookSearch="",cashBookFilter="all",editingCashEntryId=null;
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
let saleProductCatalog=[];
const saleStatuses={draft:"Bozza",sent:"Inviato",confirmed:"Confermato",delivered:"Consegnato",cancelled:"Annullato"};
function saleNumber(value){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(value)||0)}
function saleTaxSummary(lines){return lines.reduce((t,l)=>{const net=Math.round(Math.max(0,Number(l.quantity)||0)*Math.max(0,Number(l.price)||0)*(1-Math.min(100,Math.max(0,Number(l.discount)||0))/100)*100)/100,rate=Math.min(100,Math.max(0,Number(l.vatRate??22)||0)),tax=Math.round(net*rate)/100;t.net+=net;t.tax+=tax;t.total+=net+tax;return t},{net:0,tax:0,total:0})}
function saleTotals(lines){return saleTaxSummary(lines).total}
function renderSaleLines(){
 const host=document.getElementById("sale-lines");if(!host)return;
 const productOptions=selected=>'<option value="">— Articolo libero —</option>'+saleProductCatalog.map(p=>'<option value="'+p.id+'" '+(String(selected||"")===String(p.id)?"selected":"")+'>'+escapeHtml(p.name)+(p.sku?" · "+escapeHtml(p.sku):"")+'</option>').join("");
 host.innerHTML=saleDraftLines.map((line,i)=>'<div class="form-grid sale-line"><div class="form-wide"><label class="form-label">Seleziona da anagrafica</label><select class="field sale-product">'+productOptions(line.productId)+'</select><label class="form-label">Descrizione</label><input class="field sale-description" maxlength="160" value="'+escapeHtml(line.description)+'" placeholder="Descrizione articolo"></div><div><label class="form-label">Quantità</label><input class="field sale-quantity" type="number" min="0.01" step="0.01" value="'+escapeHtml(line.quantity)+'"></div><div><label class="form-label">Prezzo unitario (€)</label><input class="field sale-price" type="number" min="0" step="0.01" value="'+escapeHtml(line.price)+'"></div><div><label class="form-label">Sconto (%)</label><input class="field sale-discount" type="number" min="0" max="100" step="0.1" value="'+escapeHtml(line.discount)+'"></div><div><label class="form-label">IVA (%)</label><select class="field sale-vat">'+[0,4,5,10,22].map(n=>'<option value="'+n+'" '+(Number(line.vatRate??22)===n?"selected":"")+'>'+n+'%</option>').join("")+'</select></div><div><label class="form-label">Totale riga IVA inclusa</label><strong class="sale-line-total">'+saleNumber((Number(line.quantity)||0)*(Number(line.price)||0)*(1-(Number(line.discount)||0)/100)*(1+(Number(line.vatRate??22)||0)/100))+'</strong><button class="action danger sale-remove" type="button" data-index="'+i+'">Rimuovi riga</button></div></div>').join("");
 host.querySelectorAll(".sale-line").forEach((row,i)=>{
  row.querySelector(".sale-product").onchange=e=>{const p=saleProductCatalog.find(x=>x.id===Number(e.target.value));saleDraftLines[i].productId=p?p.id:null;if(p){saleDraftLines[i].description=p.name;saleDraftLines[i].price=Number(p.salePrice)||0;saleDraftLines[i].vatRate=Number(p.vatRate??22);renderSaleLines()}};
  const update=()=>{const l=saleDraftLines[i],net=(Number(l.quantity)||0)*(Number(l.price)||0)*(1-(Number(l.discount)||0)/100),tax=net*(Number(l.vatRate??22)||0)/100;row.querySelector(".sale-line-total").textContent=saleNumber(net+tax);const t=saleTaxSummary(saleDraftLines);document.getElementById("sale-net-total").textContent=saleNumber(t.net);document.getElementById("sale-vat-total").textContent=saleNumber(t.tax);document.getElementById("sale-grand-total").textContent=saleNumber(t.total)};
  [["description",".sale-description"],["quantity",".sale-quantity"],["price",".sale-price"],["discount",".sale-discount"],["vatRate",".sale-vat"]].forEach(([k,q])=>row.querySelector(q).oninput=e=>{saleDraftLines[i][k]=e.target.value;update()});
 });
 host.querySelectorAll(".sale-remove").forEach(b=>b.onclick=()=>{saleDraftLines.splice(Number(b.dataset.index),1);renderSaleLines()});
 const t=saleTaxSummary(saleDraftLines);document.getElementById("sale-net-total").textContent=saleNumber(t.net);document.getElementById("sale-vat-total").textContent=saleNumber(t.tax);document.getElementById("sale-grand-total").textContent=saleNumber(t.total);
}
async function renderSales(records){
  const root=document.getElementById("view");
  const sales=records.filter(r=>r.type==="sales");
  const contacts=records.filter(r=>r.type==="contacts");
  saleProductCatalog=records.filter(r=>r.type==="inventory_product");
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
  '<div class="form-wide"><h3>Righe documento</h3><div id="sale-lines"></div><button class="action secondary" type="button" id="sale-add-line">Aggiungi riga</button><p>Imponibile: <strong id="sale-net-total"></strong> · IVA: <strong id="sale-vat-total"></strong> · Totale IVA inclusa: <strong id="sale-grand-total">'+saleNumber(saleTotals(saleDraftLines))+'</strong></p></div>'+
  '<div class="form-wide"><label class="form-label" for="sale-notes">Note</label><textarea class="field" id="sale-notes" rows="3" maxlength="1500">'+escapeHtml(val("notes"))+'</textarea></div></div>'+
  '<div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Salva documento")+'</button>'+(editing?'<button class="action secondary" type="button" id="sale-cancel">Annulla</button>':"")+'</div></form></div>'+
  '<div class="panel"><div class="panel-heading"><div><h2>Preventivi e ordini</h2><p class="muted">'+filtered.length+' documenti visualizzati</p></div></div><div class="form-grid"><div><label class="form-label" for="sales-search">Cerca</label><input class="field" id="sales-search" type="search" value="'+escapeHtml(salesSearch)+'" placeholder="Numero, oggetto o cliente"></div><div><label class="form-label" for="sales-filter">Stato</label><select class="field" id="sales-filter"><option value="all">Tutti gli stati</option>'+Object.entries(saleStatuses).map(([k,v])=>'<option value="'+k+'" '+(salesStatusFilter===k?"selected":"")+'>'+v+'</option>').join("")+'</select></div></div>'+
  (filtered.length?filtered.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(s=>{const c=contacts.find(x=>x.id===s.contactId);return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(s.number||"Preventivo")+' · '+escapeHtml(s.name)+'</strong><div class="muted">'+escapeHtml(saleStatuses[s.status]||"Bozza")+(c?" · "+escapeHtml(c.name):" · Cliente non specificato")+'</div><div class="contact-details"><span>Data: '+escapeHtml(s.date||"—")+'</span><span>Totale: '+saleNumber(s.total)+'</span>'+(s.validUntil?'<span>Valido fino al: '+escapeHtml(s.validUntil)+'</span>':"")+'</div>'+(records.filter(m=>m.type==="inventory_move"&&m.sourceSaleId===s.id).length?'<div class="contact-details"><strong>Storico consegne</strong>'+records.filter(m=>m.type==="inventory_move"&&m.sourceSaleId===s.id).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(m=>'<span>'+escapeHtml(m.date||"Data non indicata")+' · '+inventoryQty(m.quantity)+' · '+escapeHtml(m.sourceSaleLineIndex!=null&&s.lines&&s.lines[m.sourceSaleLineIndex]?s.lines[m.sourceSaleLineIndex].description:"Movimento precedente")+'</span>').join("")+'</div>':"")+'</div></div><div class="contact-actions"><button class="action secondary edit-sale" data-id="'+s.id+'">Modifica</button>'+(records.some(inv=>inv.type==="invoices"&&inv.sourceSaleId===s.id)?'<span class="muted">Fattura creata</span>':'<button class="action secondary create-sale-invoice" data-id="'+s.id+'">Crea fattura</button>')+(s.status==="confirmed"||s.status==="delivered"?(records.some(m=>m.type==="inventory_move"&&m.sourceSaleId===s.id&&!Number.isInteger(m.sourceSaleLineIndex))?'<span class="muted">Movimento precedente già registrato</span>':'<button class="action secondary deliver-sale" data-id="'+s.id+'">Registra consegna parziale / completa</button>'):"")+'<button class="action danger delete-sale" data-id="'+s.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessun documento vendita trovato.</div>')+'</div>';
  renderSaleLines();
  document.getElementById("sale-add-line").onclick=()=>{saleDraftLines.push({description:"",quantity:1,price:0,discount:0});renderSaleLines()};
  document.getElementById("sales-form").onsubmit=async e=>{
    e.preventDefault();
    const name=document.getElementById("sale-title").value.trim();
    const lines=saleDraftLines.map(x=>({productId:x.productId||null,description:String(x.description||"").trim(),quantity:Number(x.quantity)||0,price:Number(x.price)||0,discount:Number(x.discount)||0,vatRate:Number(x.vatRate??22)}));
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
  root.querySelectorAll(".deliver-sale").forEach(b=>b.onclick=async()=>{
    const sale=records.find(x=>x.type==="sales"&&x.id===Number(b.dataset.id));if(!sale)return;
    const products=records.filter(x=>x.type==="inventory_product"),moves=records.filter(x=>x.type==="inventory_move"),lines=Array.isArray(sale.lines)?sale.lines:[];
    if(!lines.length){alert("Il documento non contiene righe prodotto.");return}
    const matched=lines.map((line,index)=>({line,index,product:line.productId?products.find(p=>p.id===Number(line.productId)):products.find(p=>(p.sku&&p.sku.trim().toLowerCase()===String(line.description||"").trim().toLowerCase())||(p.name||"").trim().toLowerCase()===String(line.description||"").trim().toLowerCase())}));
    if(matched.some(x=>!x.product)){alert("Una o più righe non sono collegate a un prodotto valido del magazzino.");return}
    const entries=[];
    for(const x of matched){const remaining=Math.max(0,(Number(x.line.quantity)||0)-(Number(x.line.deliveredQuantity)||0));if(!remaining)continue;const raw=prompt("Articolo: "+x.line.description+"\\nDa consegnare: "+inventoryQty(remaining)+"\\nQuantità consegnata ora (0 per saltare):",String(remaining));if(raw===null)return;const qty=Number(raw);if(!Number.isFinite(qty)||qty<0||qty>remaining){alert("Quantità non valida. Nessun movimento registrato.");return}if(qty)entries.push({...x,qty})}
    if(!entries.length){alert("Non hai indicato quantità da consegnare.");return}
    const totals=new Map();entries.forEach(x=>totals.set(x.product.id,(totals.get(x.product.id)||0)+x.qty));
    for(const [id,qty] of totals){const p=products.find(x=>x.id===id),balance=inventoryBalance(p,moves);if(qty>balance){alert("Giacenza insufficiente per "+p.name+". Nessun movimento registrato.");return}}
    if(!confirm("Registrare le quantità indicate e aggiornare il magazzino?"))return;
    for(const x of entries){await addRecord({type:"inventory_move",productId:x.product.id,direction:"out",quantity:x.qty,date:new Date().toISOString().slice(0,10),reference:sale.number||("Ordine "+sale.id),notes:"Consegna vendita "+sale.name,sourceSaleId:sale.id,sourceSaleLineIndex:x.index});x.line.deliveredQuantity=(Number(x.line.deliveredQuantity)||0)+x.qty}
    sale.status=lines.every(x=>(Number(x.deliveredQuantity)||0)>=Number(x.quantity||0))?"delivered":"confirmed";sale.updatedAt=new Date().toISOString();await updateRecord(sale);await render();
  });
  root.querySelectorAll(".create-sale-invoice").forEach(b=>b.onclick=async()=>{
    const sale=records.find(x=>x.type==="sales"&&x.id===Number(b.dataset.id));if(!sale)return;
    if(records.some(inv=>inv.type==="invoices"&&inv.sourceSaleId===sale.id)){alert("Esiste già una fattura collegata a questo documento.");return}
    const summary=saleTaxSummary(Array.isArray(sale.lines)?sale.lines:[]);const id=await addRecord({type:"invoices",kind:"customer",name:sale.name,reference:sale.number||"",contactId:sale.contactId||null,date:new Date().toISOString().slice(0,10),dueDate:new Date(Date.now()+30*86400000).toISOString().slice(0,10),net:summary.net,vatRate:summary.net?summary.tax/summary.net*100:0,tax:summary.tax,total:summary.total,paid:0,notes:"Generata dal documento vendita "+(sale.number||sale.name),sourceSaleId:sale.id,lines:Array.isArray(sale.lines)?sale.lines:[]});
    const inv=(await allRecords()).find(x=>x.id===id);if(inv){inv.number="FAT-"+String(id).padStart(5,"0");await updateRecord(inv)}
    await render();
  });
}


let purchaseSearch="";
let purchaseStatusFilter="all";
let editingPurchaseId=null;
let purchaseDraftLines=[];
let purchaseProductCatalog=[];
const purchaseStatuses={draft:"Bozza",ordered:"Ordinato",received:"Ricevuto",cancelled:"Annullato"};
function purchaseMoney(value){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(value)||0)}
function purchaseTaxSummary(lines){return lines.reduce((t,l)=>{const net=Math.round(Math.max(0,Number(l.quantity)||0)*Math.max(0,Number(l.price)||0)*100)/100,rate=Math.min(100,Math.max(0,Number(l.vatRate??22)||0)),tax=Math.round(net*rate)/100;t.net+=net;t.tax+=tax;t.total+=net+tax;return t},{net:0,tax:0,total:0})}
function purchaseTotal(lines){return purchaseTaxSummary(lines).total}
function renderPurchaseLines(){
 const host=document.getElementById("purchase-lines");if(!host)return;
 const productOptions=selected=>'<option value="">— Articolo libero —</option>'+purchaseProductCatalog.map(p=>'<option value="'+p.id+'" '+(String(selected||"")===String(p.id)?"selected":"")+'>'+escapeHtml(p.name)+(p.sku?" · "+escapeHtml(p.sku):"")+'</option>').join("");
 host.innerHTML=purchaseDraftLines.map((line,i)=>'<div class="form-grid purchase-line"><div class="form-wide"><label class="form-label">Seleziona da anagrafica</label><select class="field purchase-product">'+productOptions(line.productId)+'</select><label class="form-label">Descrizione</label><input class="field purchase-description" maxlength="160" value="'+escapeHtml(line.description)+'" placeholder="Descrizione articolo"></div><div><label class="form-label">Quantità</label><input class="field purchase-quantity" type="number" min="0.01" step="0.01" value="'+escapeHtml(line.quantity)+'"></div><div><label class="form-label">Costo unitario (€)</label><input class="field purchase-price" type="number" min="0" step="0.01" value="'+escapeHtml(line.price)+'"></div><div><label class="form-label">IVA (%)</label><select class="field purchase-vat">'+[0,4,5,10,22].map(n=>'<option value="'+n+'" '+(Number(line.vatRate??22)===n?"selected":"")+'>'+n+'%</option>').join("")+'</select></div><div><label class="form-label">Totale riga IVA inclusa</label><strong class="purchase-line-total">'+purchaseMoney((Number(line.quantity)||0)*(Number(line.price)||0)*(1+(Number(line.vatRate??22)||0)/100))+'</strong><button class="action danger purchase-remove" type="button" data-index="'+i+'">Rimuovi riga</button></div></div>').join("");
 host.querySelectorAll(".purchase-line").forEach((row,i)=>{
  row.querySelector(".purchase-product").onchange=e=>{const p=purchaseProductCatalog.find(x=>x.id===Number(e.target.value));purchaseDraftLines[i].productId=p?p.id:null;if(p){purchaseDraftLines[i].description=p.name;purchaseDraftLines[i].price=Number(p.purchasePrice)||0;purchaseDraftLines[i].vatRate=Number(p.vatRate??22);renderPurchaseLines()}};
  const update=()=>{const l=purchaseDraftLines[i],net=(Number(l.quantity)||0)*(Number(l.price)||0),tax=net*(Number(l.vatRate??22)||0)/100;row.querySelector(".purchase-line-total").textContent=purchaseMoney(net+tax);const t=purchaseTaxSummary(purchaseDraftLines);document.getElementById("purchase-net-total").textContent=purchaseMoney(t.net);document.getElementById("purchase-vat-total").textContent=purchaseMoney(t.tax);document.getElementById("purchase-grand-total").textContent=purchaseMoney(t.total)};
  [["description",".purchase-description"],["quantity",".purchase-quantity"],["price",".purchase-price"],["vatRate",".purchase-vat"]].forEach(([k,q])=>row.querySelector(q).oninput=e=>{purchaseDraftLines[i][k]=e.target.value;update()});
 });
 host.querySelectorAll(".purchase-remove").forEach(b=>b.onclick=()=>{purchaseDraftLines.splice(Number(b.dataset.index),1);renderPurchaseLines()});
 const t=purchaseTaxSummary(purchaseDraftLines);document.getElementById("purchase-net-total").textContent=purchaseMoney(t.net);document.getElementById("purchase-vat-total").textContent=purchaseMoney(t.tax);document.getElementById("purchase-grand-total").textContent=purchaseMoney(t.total);
}
async function renderPurchases(records){
  const root=document.getElementById("view");
  const purchases=records.filter(r=>r.type==="purchases");
  const contacts=records.filter(r=>r.type==="contacts");
  purchaseProductCatalog=records.filter(r=>r.type==="inventory_product");
  const editing=editingPurchaseId===null?null:purchases.find(p=>p.id===editingPurchaseId);
  const val=k=>editing?(editing[k]??""):"";
  if(editing)purchaseDraftLines=(editing.lines||[]).map(x=>({...x}));
  else if(!purchaseDraftLines.length)purchaseDraftLines=[{description:"",quantity:1,price:0}];
  const supplierOptions='<option value="">— Seleziona fornitore —</option>'+contacts.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","it")).map(c=>'<option value="'+c.id+'" '+(String(val("supplierId"))===String(c.id)?"selected":"")+'>'+escapeHtml(c.name)+(c.company?" · "+escapeHtml(c.company):"")+'</option>').join("");
  const term=purchaseSearch.trim().toLocaleLowerCase();
  const filtered=purchases.filter(p=>(purchaseStatusFilter==="all"||p.status===purchaseStatusFilter)&&[p.name,p.number,contacts.find(c=>c.id===p.supplierId)?.name].join(" ").toLocaleLowerCase().includes(term));
  const sum=purchases.reduce((n,p)=>n+(Number(p.total)||0),0);
  root.innerHTML='<div class="grid"><div class="metric"><small>Documenti acquisto</small><strong>'+purchases.length+'</strong></div><div class="metric"><small>Valore complessivo</small><strong>'+purchaseMoney(sum)+'</strong></div><div class="metric"><small>Ordini da ricevere</small><strong>'+purchases.filter(p=>p.status==="ordered").length+'</strong></div></div>'+
  '<div class="panel"><div class="panel-heading"><div><h2>'+(editing?"Modifica acquisto":"Nuova richiesta / ordine fornitore")+'</h2><p class="muted">Registra gli acquisti e controlla la ricezione della merce o dei servizi.</p></div></div>'+
  '<form id="purchase-form"><div class="form-grid"><div class="form-wide"><label class="form-label" for="purchase-title">Oggetto / riferimento *</label><input class="field" id="purchase-title" required maxlength="180" value="'+escapeHtml(val("name"))+'" placeholder="Es. Acquisto materiale ufficio"></div>'+
  '<div><label class="form-label" for="purchase-supplier">Fornitore</label><select class="field" id="purchase-supplier">'+supplierOptions+'</select></div>'+
  '<div><label class="form-label" for="purchase-status">Stato</label><select class="field" id="purchase-status">'+Object.entries(purchaseStatuses).map(([k,v])=>'<option value="'+k+'" '+(val("status")===k||(!val("status")&&k==="draft")?"selected":"")+'>'+v+'</option>').join("")+'</select></div>'+
  '<div><label class="form-label" for="purchase-date">Data ordine</label><input class="field" type="date" id="purchase-date" value="'+escapeHtml(val("date")||new Date().toISOString().slice(0,10))+'"></div>'+
  '<div><label class="form-label" for="purchase-delivery">Consegna prevista</label><input class="field" type="date" id="purchase-delivery" value="'+escapeHtml(val("expectedDelivery"))+'"></div>'+
  '<div class="form-wide"><h3>Righe acquisto</h3><div id="purchase-lines"></div><button class="action secondary" type="button" id="purchase-add-line">Aggiungi riga</button><p>Imponibile: <strong id="purchase-net-total"></strong> · IVA: <strong id="purchase-vat-total"></strong> · Totale IVA inclusa: <strong id="purchase-grand-total">'+purchaseMoney(purchaseTotal(purchaseDraftLines))+'</strong></p></div>'+
  '<div class="form-wide"><label class="form-label" for="purchase-notes">Note</label><textarea class="field" id="purchase-notes" rows="3" maxlength="1500">'+escapeHtml(val("notes"))+'</textarea></div></div>'+
  '<div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Salva acquisto")+'</button>'+(editing?'<button class="action secondary" type="button" id="purchase-cancel">Annulla</button>':"")+'</div></form></div>'+
  '<div class="panel"><div class="panel-heading"><div><h2>Richieste e ordini fornitore</h2><p class="muted">'+filtered.length+' documenti visualizzati</p></div></div><div class="form-grid"><div><label class="form-label" for="purchase-search">Cerca</label><input class="field" id="purchase-search" type="search" value="'+escapeHtml(purchaseSearch)+'" placeholder="Numero, oggetto o fornitore"></div><div><label class="form-label" for="purchase-filter">Stato</label><select class="field" id="purchase-filter"><option value="all">Tutti gli stati</option>'+Object.entries(purchaseStatuses).map(([k,v])=>'<option value="'+k+'" '+(purchaseStatusFilter===k?"selected":"")+'>'+v+'</option>').join("")+'</select></div></div>'+
  (filtered.length?filtered.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(p=>{const c=contacts.find(x=>x.id===p.supplierId);return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(p.number||"Acquisto")+' · '+escapeHtml(p.name)+'</strong><div class="muted">'+escapeHtml(purchaseStatuses[p.status]||"Bozza")+(c?" · "+escapeHtml(c.name):" · Fornitore non specificato")+'</div><div class="contact-details"><span>Data: '+escapeHtml(p.date||"—")+'</span><span>Totale: '+purchaseMoney(p.total)+'</span>'+(p.expectedDelivery?'<span>Consegna prevista: '+escapeHtml(p.expectedDelivery)+'</span>':"")+'</div>'+(records.filter(m=>m.type==="inventory_move"&&m.sourcePurchaseId===p.id).length?'<div class="contact-details"><strong>Storico ricezioni</strong>'+records.filter(m=>m.type==="inventory_move"&&m.sourcePurchaseId===p.id).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(m=>'<span>'+escapeHtml(m.date||"Data non indicata")+' · '+inventoryQty(m.quantity)+' · '+escapeHtml(m.sourcePurchaseLineIndex!=null&&p.lines&&p.lines[m.sourcePurchaseLineIndex]?p.lines[m.sourcePurchaseLineIndex].description:"Movimento precedente")+'</span>').join("")+'</div>':"")+'</div></div><div class="contact-actions"><button class="action secondary edit-purchase" data-id="'+p.id+'">Modifica</button>'+(p.status==="ordered"||p.status==="received"?(records.some(m=>m.type==="inventory_move"&&m.sourcePurchaseId===p.id&&!Number.isInteger(m.sourcePurchaseLineIndex))?'<span class="muted">Movimento precedente già registrato</span>':'<button class="action secondary receive-purchase" data-id="'+p.id+'">Registra ricezione parziale / completa</button>'):"")+'<button class="action danger delete-purchase" data-id="'+p.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessun acquisto trovato.</div>')+'</div>';
  renderPurchaseLines();
  document.getElementById("purchase-add-line").onclick=()=>{purchaseDraftLines.push({description:"",quantity:1,price:0});renderPurchaseLines()};
  document.getElementById("purchase-form").onsubmit=async e=>{
    e.preventDefault();
    const name=document.getElementById("purchase-title").value.trim();
    const lines=purchaseDraftLines.map(x=>({productId:x.productId||null,description:String(x.description||"").trim(),quantity:Number(x.quantity)||0,price:Number(x.price)||0,vatRate:Number(x.vatRate??22)}));
    if(!name||!lines.length||lines.some(x=>!x.description||x.quantity<=0||x.price<0)){alert("Completa le righe: descrizione, quantità positiva e costo non negativo.");return}
    const purchase={type:"purchases",name,supplierId:document.getElementById("purchase-supplier").value?Number(document.getElementById("purchase-supplier").value):null,status:document.getElementById("purchase-status").value,date:document.getElementById("purchase-date").value,expectedDelivery:document.getElementById("purchase-delivery").value,lines,total:purchaseTotal(lines),notes:document.getElementById("purchase-notes").value.trim()};
    if(editing){purchase.id=editing.id;purchase.number=editing.number;purchase.createdAt=editing.createdAt;purchase.updatedAt=new Date().toISOString();await updateRecord(purchase)}
    else{const id=await addRecord(purchase);purchase.id=id;purchase.number="ACQ-"+String(id).padStart(5,"0");await updateRecord(purchase)}
    editingPurchaseId=null;purchaseDraftLines=[];purchaseSearch="";purchaseStatusFilter="all";await render();
  };
  const cancel=document.getElementById("purchase-cancel");if(cancel)cancel.onclick=()=>{editingPurchaseId=null;purchaseDraftLines=[];render()};
  document.getElementById("purchase-search").oninput=e=>{purchaseSearch=e.target.value;const pos=e.target.selectionStart;render().then(()=>{const el=document.getElementById("purchase-search");el.focus();el.setSelectionRange(pos,pos)})};
  document.getElementById("purchase-filter").onchange=e=>{purchaseStatusFilter=e.target.value;render()};
  root.querySelectorAll(".edit-purchase").forEach(b=>b.onclick=()=>{editingPurchaseId=Number(b.dataset.id);purchaseDraftLines=[];render()});
  root.querySelectorAll(".delete-purchase").forEach(b=>b.onclick=async()=>{if(confirm("Eliminare definitivamente questo documento di acquisto?")){await deleteRecord(Number(b.dataset.id));render()}});
  root.querySelectorAll(".receive-purchase").forEach(b=>b.onclick=async()=>{
    const purchase=records.find(x=>x.type==="purchases"&&x.id===Number(b.dataset.id));if(!purchase)return;
    const products=records.filter(x=>x.type==="inventory_product"),lines=Array.isArray(purchase.lines)?purchase.lines:[];
    if(!lines.length){alert("L'ordine non contiene righe prodotto.");return}
    const matched=lines.map((line,index)=>({line,index,product:line.productId?products.find(p=>p.id===Number(line.productId)):products.find(p=>(p.sku&&p.sku.trim().toLowerCase()===String(line.description||"").trim().toLowerCase())||(p.name||"").trim().toLowerCase()===String(line.description||"").trim().toLowerCase())}));
    if(matched.some(x=>!x.product)){alert("Una o più righe non sono collegate a un prodotto valido del magazzino.");return}
    const entries=[];
    for(const x of matched){const remaining=Math.max(0,(Number(x.line.quantity)||0)-(Number(x.line.receivedQuantity)||0));if(!remaining)continue;const raw=prompt("Articolo: "+x.line.description+"\\nDa ricevere: "+inventoryQty(remaining)+"\\nQuantità ricevuta ora (0 per saltare):",String(remaining));if(raw===null)return;const qty=Number(raw);if(!Number.isFinite(qty)||qty<0||qty>remaining){alert("Quantità non valida. Nessun movimento registrato.");return}if(qty)entries.push({...x,qty})}
    if(!entries.length){alert("Non hai indicato quantità da ricevere.");return}
    if(!confirm("Registrare le quantità indicate e aggiornare il magazzino?"))return;
    for(const x of entries){await addRecord({type:"inventory_move",productId:x.product.id,direction:"in",quantity:x.qty,date:new Date().toISOString().slice(0,10),reference:purchase.number||("Acquisto "+purchase.id),notes:"Ricezione acquisto "+purchase.name,sourcePurchaseId:purchase.id,sourcePurchaseLineIndex:x.index});x.line.receivedQuantity=(Number(x.line.receivedQuantity)||0)+x.qty}
    purchase.status=lines.every(x=>(Number(x.receivedQuantity)||0)>=Number(x.quantity||0))?"received":"ordered";purchase.updatedAt=new Date().toISOString();await updateRecord(purchase);await render();
  });;
}


let editingProductId=null;
let inventorySearch="";
let movementFilter="all";
function inventoryMoney(value){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(value)||0)}
function inventoryQty(value){return new Intl.NumberFormat("it-IT",{maximumFractionDigits:3}).format(Number(value)||0)}
function inventoryBalance(product,movements){return (Number(product.openingStock)||0)+movements.filter(m=>m.productId===product.id).reduce((n,m)=>n+(m.direction==="in"?1:-1)*(Number(m.quantity)||0),0)}
async function renderInventory(records){
 const root=document.getElementById("view");
 const products=records.filter(r=>r.type==="inventory_product");
 const movements=records.filter(r=>r.type==="inventory_move");
 const editing=editingProductId===null?null:products.find(p=>p.id===editingProductId);
 const val=k=>editing?(editing[k]??""):"";
 const term=inventorySearch.trim().toLocaleLowerCase();
 const filtered=products.filter(p=>[p.name,p.sku,p.barcode,p.category,p.unit,p.description].join(" ").toLocaleLowerCase().includes(term));
 const totalUnits=products.reduce((n,p)=>n+inventoryBalance(p,movements),0);
 const lowStock=products.filter(p=>inventoryBalance(p,movements)<=Number(p.minStock||0));
 const productOptions='<option value="">— Seleziona prodotto —</option>'+products.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","it")).map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name)+(p.sku?" · "+escapeHtml(p.sku):"")+'</option>').join("");
 root.innerHTML='<div class="grid"><div class="metric"><small>Prodotti</small><strong>'+products.length+'</strong></div><div class="metric"><small>Giacenza complessiva</small><strong>'+inventoryQty(totalUnits)+'</strong></div><div class="metric"><small>Sotto scorta minima</small><strong>'+lowStock.length+'</strong></div></div>'+
 '<div class="panel"><div class="panel-heading"><div><h2>'+(editing?"Modifica prodotto":"Nuovo prodotto")+'</h2><p class="muted">Crea l’anagrafica e indica la giacenza iniziale e la soglia minima.</p></div></div><form id="product-form"><div class="form-grid">'+
 '<div class="form-wide"><label class="form-label" for="product-name">Nome prodotto *</label><input class="field" id="product-name" required maxlength="180" value="'+escapeHtml(val("name"))+'" placeholder="Nome articolo o prodotto"></div>'+
 '<div><label class="form-label" for="product-sku">Codice / SKU</label><input class="field" id="product-sku" maxlength="80" value="'+escapeHtml(val("sku"))+'" placeholder="Codice interno"></div>'+
 '<div><label class="form-label" for="product-barcode">Codice a barre</label><input class="field" id="product-barcode" maxlength="100" value="'+escapeHtml(val("barcode"))+'" placeholder="EAN / UPC"></div>'+
 '<div><label class="form-label" for="product-category">Categoria</label><input class="field" id="product-category" maxlength="100" value="'+escapeHtml(val("category"))+'" placeholder="Categoria"></div>'+
 '<div><label class="form-label" for="product-unit">Unità di misura</label><input class="field" id="product-unit" maxlength="30" value="'+escapeHtml(val("unit")||"pz")+'" placeholder="pz, kg, m…"></div>'+
 '<div><label class="form-label" for="product-variant">Variante / attributi</label><input class="field" id="product-variant" maxlength="180" value="'+escapeHtml(val("variant"))+'" placeholder="Es. taglia M, colore nero"></div>'+
 '<div><label class="form-label" for="product-vat">Aliquota IVA (%)</label><select class="field" id="product-vat">'+[0,4,5,10,22].map(n=>'<option value="'+n+'" '+(Number(val("vatRate")??22)===n?"selected":"")+'>'+n+'%</option>').join("")+'</select></div>'+
 '<div class="form-wide"><label class="form-label" for="product-description">Descrizione prodotto</label><textarea class="field" id="product-description" rows="3" maxlength="1500" placeholder="Descrizione, caratteristiche e note tecniche">'+escapeHtml(val("description"))+'</textarea></div>'+
 '<div><label class="form-label" for="product-opening">Giacenza iniziale</label><input class="field" id="product-opening" type="number" min="0" step="0.001" value="'+escapeHtml(val("openingStock")??0)+'"></div>'+
 '<div><label class="form-label" for="product-min">Scorta minima</label><input class="field" id="product-min" type="number" min="0" step="0.001" value="'+escapeHtml(val("minStock")??0)+'"></div>'+
 '<div><label class="form-label" for="product-purchase-price">Prezzo di acquisto (€)</label><input class="field" id="product-purchase-price" type="number" min="0" step="0.01" value="'+escapeHtml(val("purchasePrice")??0)+'"></div>'+
 '<div><label class="form-label" for="product-sale-price">Prezzo di vendita (€)</label><input class="field" id="product-sale-price" type="number" min="0" step="0.01" value="'+escapeHtml(val("salePrice")??0)+'"></div>'+
 '</div><div class="toolbar"><button class="action" type="submit">'+(editing?"Salva prodotto":"Crea prodotto")+'</button>'+(editing?'<button class="action secondary" type="button" id="product-cancel">Annulla</button>':"")+'</div></form></div>'+
 '<div class="panel"><div class="panel-heading"><div><h2>Prodotti e giacenze</h2><p class="muted">'+filtered.length+' prodotti visualizzati</p></div></div><input class="field" id="inventory-search" type="search" value="'+escapeHtml(inventorySearch)+'" placeholder="Cerca nome, codice o categoria">'+
 (filtered.length?filtered.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","it")).map(p=>{const balance=inventoryBalance(p,movements);return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(p.name)+'</strong><div class="muted">'+(p.sku?"SKU: "+escapeHtml(p.sku)+" · ":"")+(p.barcode?"EAN: "+escapeHtml(p.barcode)+" · ":"")+(p.category?escapeHtml(p.category)+" · ":"")+escapeHtml(p.unit||"pz")+'</div>'+(p.variant?'<div class="contact-details">Variante: '+escapeHtml(p.variant)+'</div>':"")+'<div class="contact-details">IVA predefinita: '+inventoryQty(p.vatRate??22)+'%</div>'+(p.description?'<div class="contact-details">'+escapeHtml(p.description)+'</div>':"")+'<div class="contact-details"><span>Acquisto: '+inventoryMoney(p.purchasePrice)+'</span><span>Vendita: '+inventoryMoney(p.salePrice)+'</span></div><div class="contact-details"><span>Giacenza: <strong>'+inventoryQty(balance)+'</strong> '+escapeHtml(p.unit||"pz")+'</span><span>Scorta minima: '+inventoryQty(p.minStock)+' '+escapeHtml(p.unit||"pz")+'</span>'+(balance<=Number(p.minStock||0)?'<span><strong>Scorta da reintegrare</strong></span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary edit-product" data-id="'+p.id+'">Modifica</button><button class="action danger delete-product" data-id="'+p.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessun prodotto presente.</div>')+'</div>'+
 '<div class="panel"><div class="panel-heading"><div><h2>Registra movimento</h2><p class="muted">Carichi e scarichi aggiornano automaticamente le giacenze.</p></div></div><form id="movement-form"><div class="form-grid">'+
 '<div class="form-wide"><label class="form-label" for="movement-product">Prodotto *</label><select class="field" id="movement-product" required>'+productOptions+'</select></div>'+
 '<div><label class="form-label" for="movement-direction">Tipo movimento</label><select class="field" id="movement-direction"><option value="in">Carico</option><option value="out">Scarico</option></select></div>'+
 '<div><label class="form-label" for="movement-quantity">Quantità *</label><input class="field" id="movement-quantity" type="number" min="0.001" step="0.001" required></div>'+
 '<div><label class="form-label" for="movement-date">Data</label><input class="field" id="movement-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
 '<div><label class="form-label" for="movement-reference">Riferimento</label><input class="field" id="movement-reference" maxlength="100" placeholder="Documento / ordine"></div>'+
 '<div class="form-wide"><label class="form-label" for="movement-notes">Causale / note</label><input class="field" id="movement-notes" maxlength="500" placeholder="Motivo del movimento"></div>'+
 '</div><div class="toolbar"><button class="action" type="submit" '+(products.length?"":"disabled")+'>Registra movimento</button></div></form></div>'+
 '<div class="panel"><div class="panel-heading"><div><h2>Ultimi movimenti</h2><p class="muted">'+movements.length+' movimenti registrati</p></div></div><label class="form-label" for="movement-filter">Filtra elenco</label><select class="field" id="movement-filter"><option value="all">Tutti i movimenti</option><option value="in" '+(movementFilter==="in"?"selected":"")+'>Solo carichi</option><option value="out" '+(movementFilter==="out"?"selected":"")+'>Solo scarichi</option></select>'+
 (movements.filter(m=>movementFilter==="all"||m.direction===movementFilter).length?movements.filter(m=>movementFilter==="all"||m.direction===movementFilter).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.id-a.id)).map(m=>{const p=products.find(x=>x.id===m.productId);return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+(m.direction==="in"?"Carico":"Scarico")+' · '+escapeHtml(p?.name||"Prodotto eliminato")+'</strong><div class="muted">'+escapeHtml(m.date||"")+(m.reference?" · Rif. "+escapeHtml(m.reference):"")+'</div><div class="contact-details"><span>Quantità: '+inventoryQty(m.quantity)+' '+escapeHtml(p?.unit||"")+'</span>'+(m.notes?'<span>'+escapeHtml(m.notes)+'</span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary edit-movement" data-id="'+m.id+'">Modifica quantità</button><button class="action danger delete-movement" data-id="'+m.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessun movimento registrato.</div>')+'</div>';
 document.getElementById("product-form").onsubmit=async e=>{
  e.preventDefault();const name=document.getElementById("product-name").value.trim(),opening=Number(document.getElementById("product-opening").value)||0,min=Number(document.getElementById("product-min").value)||0;
  if(!name||opening<0||min<0){alert("Controlla nome e quantità.");return}
  const sku=document.getElementById("product-sku").value.trim().toLocaleLowerCase(),barcode=document.getElementById("product-barcode").value.trim();
  const duplicate=products.find(p=>p.id!==editingProductId&&((sku&&String(p.sku||"").trim().toLocaleLowerCase()===sku)||(barcode&&String(p.barcode||"").trim()===barcode)));
  if(duplicate){alert("Questo codice SKU o codice a barre è già assegnato a un altro prodotto.");return}
  const product={type:"inventory_product",name,sku:document.getElementById("product-sku").value.trim(),barcode:document.getElementById("product-barcode").value.trim(),purchasePrice:Math.max(0,Number(document.getElementById("product-purchase-price").value)||0),salePrice:Math.max(0,Number(document.getElementById("product-sale-price").value)||0),category:document.getElementById("product-category").value.trim(),unit:document.getElementById("product-unit").value.trim()||"pz",variant:document.getElementById("product-variant").value.trim(),vatRate:Number(document.getElementById("product-vat").value),description:document.getElementById("product-description").value.trim(),openingStock:opening,minStock:min};
  if(editing){product.id=editing.id;product.createdAt=editing.createdAt;product.updatedAt=new Date().toISOString();await updateRecord(product)}else await addRecord(product);
  editingProductId=null;inventorySearch="";await render();
 };
 const pc=document.getElementById("product-cancel");if(pc)pc.onclick=()=>{editingProductId=null;render()};
 document.getElementById("inventory-search").oninput=e=>{inventorySearch=e.target.value;const pos=e.target.selectionStart;render().then(()=>{const el=document.getElementById("inventory-search");el.focus();el.setSelectionRange(pos,pos)})};
 root.querySelectorAll(".edit-product").forEach(b=>b.onclick=()=>{editingProductId=Number(b.dataset.id);render()});
 root.querySelectorAll(".delete-product").forEach(b=>b.onclick=async()=>{const id=Number(b.dataset.id);if(movements.some(m=>m.productId===id)){alert("Non puoi eliminare un prodotto con movimenti registrati. Conserva la tracciabilità.");return}if(confirm("Eliminare questo prodotto?")){await deleteRecord(id);render()}});
 document.getElementById("movement-filter").onchange=e=>{movementFilter=e.target.value;render()};
 document.getElementById("movement-form").onsubmit=async e=>{
  e.preventDefault();const productId=Number(document.getElementById("movement-product").value),product=products.find(p=>p.id===productId),quantity=Number(document.getElementById("movement-quantity").value),direction=document.getElementById("movement-direction").value;
  if(!product||!Number.isFinite(quantity)||quantity<=0){alert("Seleziona un prodotto e inserisci una quantità positiva.");return}
  const balance=inventoryBalance(product,movements);
  if(direction==="out"&&quantity>balance){alert("Giacenza insufficiente: disponibili "+inventoryQty(balance)+" "+(product.unit||"pz")+".");return}
  await addRecord({type:"inventory_move",productId,direction,quantity,date:document.getElementById("movement-date").value,reference:document.getElementById("movement-reference").value.trim(),notes:document.getElementById("movement-notes").value.trim()});
  await render();
 };
 root.querySelectorAll(".edit-movement").forEach(b=>b.onclick=async()=>{
  const movement=movements.find(m=>m.id===Number(b.dataset.id));if(!movement)return;
  const entered=prompt("Nuova quantità del movimento:",String(movement.quantity));if(entered===null)return;
  const quantity=Number(entered);if(!Number.isFinite(quantity)||quantity<=0){alert("Inserisci una quantità positiva.");return}
  const product=products.find(p=>p.id===movement.productId);if(!product){alert("Prodotto non trovato: impossibile modificare il movimento.");return}
  const linkedSale=movement.sourceSaleId?records.find(x=>x.type==="sales"&&x.id===movement.sourceSaleId):null;
  const linkedPurchase=movement.sourcePurchaseId?records.find(x=>x.type==="purchases"&&x.id===movement.sourcePurchaseId):null;
  const saleLine=linkedSale&&Number.isInteger(movement.sourceSaleLineIndex)?linkedSale.lines[movement.sourceSaleLineIndex]:null;
  const purchaseLine=linkedPurchase&&Number.isInteger(movement.sourcePurchaseLineIndex)?linkedPurchase.lines[movement.sourcePurchaseLineIndex]:null;
  if(saleLine&&quantity>(Number(saleLine.quantity)||0)-(Number(saleLine.deliveredQuantity)||0)+(Number(movement.quantity)||0)){alert("La quantità supera quella ancora consegnabile nell'ordine.");return}
  if(purchaseLine&&quantity>(Number(purchaseLine.quantity)||0)-(Number(purchaseLine.receivedQuantity)||0)+(Number(movement.quantity)||0)){alert("La quantità supera quella ancora ricevibile nell'ordine.");return}
  if(movement.direction==="out"){
    const balanceWithout=inventoryBalance(product,movements.filter(m=>m.id!==movement.id));
    if(quantity>balanceWithout){alert("Giacenza insufficiente per questa quantità.");return}
  }
  const delta=quantity-(Number(movement.quantity)||0);
  if(saleLine){
    saleLine.deliveredQuantity=Math.max(0,(Number(saleLine.deliveredQuantity)||0)+delta);
    linkedSale.status=linkedSale.lines.every(x=>(Number(x.deliveredQuantity)||0)>=(Number(x.quantity)||0))?"delivered":"confirmed";
    linkedSale.updatedAt=new Date().toISOString();await updateRecord(linkedSale);
  }
  if(purchaseLine){
    purchaseLine.receivedQuantity=Math.max(0,(Number(purchaseLine.receivedQuantity)||0)+delta);
    linkedPurchase.status=linkedPurchase.lines.every(x=>(Number(x.receivedQuantity)||0)>=(Number(x.quantity)||0))?"received":"ordered";
    linkedPurchase.updatedAt=new Date().toISOString();await updateRecord(linkedPurchase);
  }
  movement.quantity=quantity;movement.updatedAt=new Date().toISOString();await updateRecord(movement);await render();
 });
 root.querySelectorAll(".delete-movement").forEach(b=>b.onclick=async()=>{
  const movement=movements.find(m=>m.id===Number(b.dataset.id));if(!movement)return;
  const linkedSale=movement.sourceSaleId?records.find(x=>x.type==="sales"&&x.id===movement.sourceSaleId):null;
  const linkedPurchase=movement.sourcePurchaseId?records.find(x=>x.type==="purchases"&&x.id===movement.sourcePurchaseId):null;
  const linked=linkedSale||linkedPurchase;
  const detail=linked?" Il movimento è collegato a "+(linkedSale?"una vendita":"un acquisto")+" e la quantità registrata verrà ripristinata nel documento.":"";
  if(!confirm("Eliminare questo movimento? La giacenza verrà ricalcolata."+detail))return;
  if(linked&&Number.isInteger(movement.sourceSaleLineIndex)&&linkedSale&&linkedSale.lines[movement.sourceSaleLineIndex]){
    const line=linkedSale.lines[movement.sourceSaleLineIndex];line.deliveredQuantity=Math.max(0,(Number(line.deliveredQuantity)||0)-(Number(movement.quantity)||0));
    linkedSale.status=linkedSale.lines.every(x=>(Number(x.deliveredQuantity)||0)>=Number(x.quantity||0))?"delivered":(linkedSale.lines.some(x=>(Number(x.deliveredQuantity)||0)>0)?"confirmed":(linkedSale.status==="delivered"?"confirmed":linkedSale.status));
    linkedSale.updatedAt=new Date().toISOString();await updateRecord(linkedSale);
  }
  if(linked&&Number.isInteger(movement.sourcePurchaseLineIndex)&&linkedPurchase&&linkedPurchase.lines[movement.sourcePurchaseLineIndex]){
    const line=linkedPurchase.lines[movement.sourcePurchaseLineIndex];line.receivedQuantity=Math.max(0,(Number(line.receivedQuantity)||0)-(Number(movement.quantity)||0));
    linkedPurchase.status=linkedPurchase.lines.every(x=>(Number(x.receivedQuantity)||0)>=Number(x.quantity||0))?"received":"ordered";
    linkedPurchase.updatedAt=new Date().toISOString();await updateRecord(linkedPurchase);
  }
  await deleteRecord(Number(b.dataset.id));await render();
});
}


let invoiceSearch="",invoiceFilter="all",editingInvoiceId=null;
let payingInvoiceId=null;
const invoiceKindNames={customer:"Fattura cliente",supplier:"Fattura fornitore"};
function invoiceFmt(n){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n)||0)}
async function renderInvoices(records){
 const root=document.getElementById("view"),items=records.filter(r=>r.type==="invoices"),contacts=records.filter(r=>r.type==="contacts"),editing=items.find(x=>x.id===editingInvoiceId),v=k=>editing?(editing[k]??""):"";
 const filtered=items.filter(x=>(invoiceFilter==="all"||x.kind===invoiceFilter)&&[x.number,x.name,contacts.find(c=>c.id===x.contactId)?.name].join(" ").toLowerCase().includes(invoiceSearch.toLowerCase()));
 const options='<option value="">— Nessun contatto —</option>'+contacts.map(c=>'<option value="'+c.id+'" '+(String(v("contactId"))===String(c.id)?"selected":"")+'>'+escapeHtml(c.name)+'</option>').join("");
 root.innerHTML='<div class="grid"><div class="metric"><small>Fatture</small><strong>'+items.length+'</strong></div><div class="metric"><small>Totale emesso / ricevuto</small><strong>'+invoiceFmt(items.reduce((n,x)=>n+(Number(x.total)||0),0))+'</strong></div><div class="metric"><small>Residuo da saldare</small><strong>'+invoiceFmt(items.reduce((n,x)=>n+Math.max(0,(Number(x.total)||0)-(Number(x.paid)||0)),0))+'</strong></div></div>'+
 '<div class="panel"><h2>'+(editing?"Modifica fattura":"Nuova fattura")+'</h2><p class="muted">Registra fatture clienti e fornitori, con IVA e pagamenti.</p><form id="invoice-form"><div class="form-grid">'+
 '<div><label class="form-label">Tipo</label><select class="field" id="iv-kind"><option value="customer" '+(v("kind")!=="supplier"?"selected":"")+'>Fattura cliente</option><option value="supplier" '+(v("kind")==="supplier"?"selected":"")+'>Fattura fornitore</option></select></div>'+
 '<div><label class="form-label">Cliente / fornitore</label><select class="field" id="iv-contact">'+options+'</select></div>'+
 '<div class="form-wide"><label class="form-label">Oggetto / riferimento *</label><input class="field" id="iv-name" required maxlength="180" value="'+escapeHtml(v("name"))+'"></div>'+
 '<div><label class="form-label">Numero fattura</label><input class="field" id="iv-ref" maxlength="60" value="'+escapeHtml(v("reference"))+'" placeholder="Numero del documento"></div>'+
 '<div><label class="form-label">Data</label><input class="field" id="iv-date" type="date" value="'+escapeHtml(v("date")||new Date().toISOString().slice(0,10))+'"></div>'+
 '<div><label class="form-label">Scadenza</label><input class="field" id="iv-due" type="date" value="'+escapeHtml(v("dueDate"))+'"></div>'+
 '<div><label class="form-label">Imponibile (€)</label><input class="field" id="iv-net" type="number" min="0" step="0.01" required value="'+escapeHtml(v("net")||"0")+'"></div>'+
 '<div><label class="form-label">Aliquota IVA (%)</label><input class="field" id="iv-vat" type="number" min="0" max="100" step="any" value="'+escapeHtml(v("vatRate")??22)+'"></div>'+
 '<div><label class="form-label">Totale (€)</label><strong id="iv-total">'+invoiceFmt((Number(v("net"))||0)*(1+(Number(v("vatRate")??22)||0)/100))+'</strong></div>'+
 '<div><label class="form-label">Importo pagato (€)</label><input class="field" id="iv-paid" type="number" min="0" step="0.01" value="'+escapeHtml(v("paid")||"0")+'"></div>'+
 '<div class="form-wide"><label class="form-label">Note</label><textarea class="field" id="iv-notes" rows="3" maxlength="1200">'+escapeHtml(v("notes"))+'</textarea></div></div><div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Registra fattura")+'</button>'+(editing?'<button class="action secondary" id="iv-cancel" type="button">Annulla</button>':"")+'</div></form></div>'+
 '<div class="panel"><h2>Registro fatture</h2><input class="field" id="iv-search" type="search" placeholder="Cerca numero, oggetto o contatto" value="'+escapeHtml(invoiceSearch)+'"><select class="field" id="iv-filter"><option value="all">Clienti e fornitori</option><option value="customer" '+(invoiceFilter==="customer"?"selected":"")+'>Solo clienti</option><option value="supplier" '+(invoiceFilter==="supplier"?"selected":"")+'>Solo fornitori</option></select>'+
 (filtered.length?filtered.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(x=>{const c=contacts.find(z=>z.id===x.contactId),paid=Number(x.paid)||0,due=Math.max(0,(Number(x.total)||0)-paid),overdue=due>0&&x.dueDate&&x.dueDate<new Date().toISOString().slice(0,10),state=due===0?"Saldata":overdue?"Scaduta":paid>0?"Parzialmente saldata":"Da saldare",payments=Array.isArray(x.payments)?x.payments:[];return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(x.number||x.reference||"Fattura")+' · '+escapeHtml(x.name)+'</strong><div class="muted">'+invoiceKindNames[x.kind]+' · '+state+(c?" · "+escapeHtml(c.name):"")+'</div><div class="contact-details"><span>Data: '+escapeHtml(x.date||"—")+'</span><span>Totale: '+invoiceFmt(x.total)+'</span><span>Pagato: '+invoiceFmt(paid)+'</span><span>Residuo: '+invoiceFmt(due)+'</span>'+(x.dueDate?'<span>Scadenza: '+escapeHtml(x.dueDate)+'</span>':"")+(payments.length?'<span>Pagamenti registrati: '+payments.length+'</span>':"")+'</div>'+(payments.length?'<div class="contact-details">'+payments.map(p=>'<span>Pagamento '+escapeHtml(p.date||"—")+': '+invoiceFmt(p.amount)+(p.reference?" · "+escapeHtml(p.reference):"")+'</span>').join("")+'</div>':"")+(payingInvoiceId===x.id&&due>0?'<form class="iv-payment-form" data-id="'+x.id+'"><div class="form-grid"><div><label class="form-label">Importo (€)</label><input class="field" name="amount" type="number" min="0.01" max="'+due.toFixed(2)+'" step="0.01" required></div><div><label class="form-label">Data pagamento</label><input class="field" name="date" type="date" value="'+new Date().toISOString().slice(0,10)+'" required></div><div class="form-wide"><label class="form-label">Riferimento / metodo (facoltativo)</label><input class="field" name="reference" maxlength="120" placeholder="Bonifico, contanti, riferimento…"></div></div><div class="toolbar"><button class="action" type="submit">Conferma pagamento</button><button class="action secondary iv-payment-cancel" type="button">Annulla</button></div></form>':"")+'</div></div><div class="contact-actions"><button class="action secondary iv-edit" data-id="'+x.id+'">Modifica</button>'+(due>0?'<button class="action secondary iv-pay" data-id="'+x.id+'">Registra pagamento</button>':"")+'<button class="action danger iv-delete" data-id="'+x.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessuna fattura registrata.</div>')+'</div>';
 const updateTotal=()=>{const n=Number(document.getElementById("iv-net").value)||0,r=Number(document.getElementById("iv-vat").value)||0;document.getElementById("iv-total").textContent=invoiceFmt(n*(1+r/100))};
 document.getElementById("iv-net").oninput=updateTotal;document.getElementById("iv-vat").oninput=updateTotal;
 document.getElementById("invoice-form").onsubmit=async e=>{e.preventDefault();const net=Number(document.getElementById("iv-net").value)||0,rate=Number(document.getElementById("iv-vat").value)||0,total=Math.round(net*(1+rate/100)*100)/100,paid=Number(document.getElementById("iv-paid").value)||0,name=document.getElementById("iv-name").value.trim();if(!name||net<0||rate<0||rate>100||paid<0||paid>total){alert("Controlla imponibile, IVA e importo pagato.");return}const kind=document.getElementById("iv-kind").value,inv={type:"invoices",kind,name,reference:document.getElementById("iv-ref").value.trim(),contactId:document.getElementById("iv-contact").value?Number(document.getElementById("iv-contact").value):null,date:document.getElementById("iv-date").value,dueDate:document.getElementById("iv-due").value,net,vatRate:rate,tax:Math.round((total-net)*100)/100,total,paid,notes:document.getElementById("iv-notes").value.trim()};if(editing){inv.id=editing.id;inv.number=editing.number;inv.createdAt=editing.createdAt;inv.updatedAt=new Date().toISOString();if(editing.sourceSaleId)inv.sourceSaleId=editing.sourceSaleId;if(Array.isArray(editing.lines))inv.lines=editing.lines;await updateRecord(inv)}else{const id=await addRecord(inv);inv.id=id;inv.number=(kind==="customer"?"FAT-":"FATT-")+String(id).padStart(5,"0");await updateRecord(inv)}editingInvoiceId=null;await render()};
 const cancel=document.getElementById("iv-cancel");if(cancel)cancel.onclick=()=>{editingInvoiceId=null;render()};
 document.getElementById("iv-search").oninput=e=>{invoiceSearch=e.target.value;const p=e.target.selectionStart;render().then(()=>{const el=document.getElementById("iv-search");el.focus();el.setSelectionRange(p,p)})};
 document.getElementById("iv-filter").onchange=e=>{invoiceFilter=e.target.value;render()};
 root.querySelectorAll(".iv-edit").forEach(b=>b.onclick=()=>{editingInvoiceId=Number(b.dataset.id);render()});
 root.querySelectorAll(".iv-delete").forEach(b=>b.onclick=async()=>{if(confirm("Eliminare questa fattura?")){await deleteRecord(Number(b.dataset.id));render()}});
 root.querySelectorAll(".iv-pay").forEach(b=>b.onclick=()=>{payingInvoiceId=Number(b.dataset.id);render()});
 root.querySelectorAll(".iv-payment-cancel").forEach(b=>b.onclick=()=>{payingInvoiceId=null;render()});
 root.querySelectorAll(".iv-payment-form").forEach(form=>form.onsubmit=async e=>{e.preventDefault();const id=Number(form.dataset.id),invoice=items.find(x=>x.id===id);if(!invoice)return;const amount=Math.round(Number(form.elements.amount.value)*100)/100,date=form.elements.date.value,reference=form.elements.reference.value.trim(),balance=Math.max(0,Math.round(((Number(invoice.total)||0)-(Number(invoice.paid)||0))*100)/100);if(!Number.isFinite(amount)||amount<=0||amount>balance){alert("L’importo deve essere positivo e non superiore al residuo di "+invoiceFmt(balance)+".");return}const payments=Array.isArray(invoice.payments)?invoice.payments.slice():[];payments.push({date,amount,reference});invoice.payments=payments;invoice.paid=Math.round(((Number(invoice.paid)||0)+amount)*100)/100;invoice.updatedAt=new Date().toISOString();await updateRecord(invoice);payingInvoiceId=null;await render()});
}


let activitySearch="",activityFilter="all",editingActivityId=null;
const activityPriorities={low:"Bassa",normal:"Normale",high:"Alta",urgent:"Urgente"};
const activityStatuses={todo:"Da fare",doing:"In corso",done:"Completata"};
async function renderActivities(records){
 const root=document.getElementById("view"),items=records.filter(r=>r.type==="activities"),contacts=records.filter(r=>r.type==="contacts"),editing=items.find(x=>x.id===editingActivityId),v=k=>editing?(editing[k]??""):"";
 const term=activitySearch.trim().toLocaleLowerCase();
 const filtered=items.filter(x=>(activityFilter==="all"||x.status===activityFilter)&&[x.name,x.notes,contacts.find(c=>c.id===x.contactId)?.name].join(" ").toLocaleLowerCase().includes(term));
 const options='<option value="">— Nessun contatto —</option>'+contacts.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","it")).map(c=>'<option value="'+c.id+'" '+(String(v("contactId"))===String(c.id)?"selected":"")+'>'+escapeHtml(c.name)+'</option>').join("");
 const today=new Date().toISOString().slice(0,10),open=items.filter(x=>x.status!=="done").length,late=items.filter(x=>x.status!=="done"&&x.dueDate&&x.dueDate<today).length;
 root.innerHTML='<div class="grid"><div class="metric"><small>Attività aperte</small><strong>'+open+'</strong></div><div class="metric"><small>In ritardo</small><strong>'+late+'</strong></div><div class="metric"><small>Completate</small><strong>'+items.filter(x=>x.status==="done").length+'</strong></div></div>'+
 '<div class="panel"><div class="panel-heading"><div><h2>'+(editing?"Modifica attività":"Nuova attività")+'</h2><p class="muted">Crea promemoria, appuntamenti e attività collegate ai contatti.</p></div></div><form id="activity-form"><div class="form-grid">'+
 '<div class="form-wide"><label class="form-label" for="act-name">Titolo *</label><input class="field" id="act-name" required maxlength="180" value="'+escapeHtml(v("name"))+'" placeholder="Es. Chiamare il cliente"></div>'+
 '<div><label class="form-label" for="act-type">Tipo</label><select class="field" id="act-type">'+["task:Attività","call:Telefonata","meeting:Appuntamento","email:Email","reminder:Promemoria"].map(z=>{const p=z.split(":");return '<option value="'+p[0]+'" '+(v("activityType")===p[0]?"selected":"")+'>'+p[1]+'</option>'}).join("")+'</select></div>'+
 '<div><label class="form-label" for="act-status">Stato</label><select class="field" id="act-status">'+Object.entries(activityStatuses).map(([k,n])=>'<option value="'+k+'" '+((v("status")||"todo")===k?"selected":"")+'>'+n+'</option>').join("")+'</select></div>'+
 '<div><label class="form-label" for="act-priority">Priorità</label><select class="field" id="act-priority">'+Object.entries(activityPriorities).map(([k,n])=>'<option value="'+k+'" '+((v("priority")||"normal")===k?"selected":"")+'>'+n+'</option>').join("")+'</select></div>'+
 '<div><label class="form-label" for="act-date">Data / scadenza</label><input class="field" id="act-date" type="date" value="'+escapeHtml(v("dueDate"))+'"></div>'+
 '<div><label class="form-label" for="act-time">Ora</label><input class="field" id="act-time" type="time" value="'+escapeHtml(v("time"))+'"></div>'+
 '<div><label class="form-label" for="act-contact">Contatto collegato</label><select class="field" id="act-contact">'+options+'</select></div>'+
 '<div class="form-wide"><label class="form-label" for="act-notes">Descrizione / note</label><textarea class="field" id="act-notes" rows="3" maxlength="1500">'+escapeHtml(v("notes"))+'</textarea></div></div><div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Crea attività")+'</button>'+(editing?'<button class="action secondary" id="act-cancel" type="button">Annulla</button>':"")+'</div></form></div>'+
 '<div class="panel"><div class="panel-heading"><div><h2>Agenda attività</h2><p class="muted">'+filtered.length+' elementi</p></div></div><input class="field" id="act-search" type="search" placeholder="Cerca attività o contatto" value="'+escapeHtml(activitySearch)+'"><select class="field" id="act-filter"><option value="all">Tutti gli stati</option>'+Object.entries(activityStatuses).map(([k,n])=>'<option value="'+k+'" '+(activityFilter===k?"selected":"")+'>'+n+'</option>').join("")+'</select>'+
 (filtered.length?filtered.slice().sort((a,b)=>(a.dueDate||"9999").localeCompare(b.dueDate||"9999")||(a.time||"").localeCompare(b.time||"")).map(x=>{const c=contacts.find(z=>z.id===x.contactId),over=x.status!=="done"&&x.dueDate&&x.dueDate<today;return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(x.name)+'</strong><div class="muted">'+(activityStatuses[x.status]||"Da fare")+' · Priorità '+(activityPriorities[x.priority]||"Normale")+(over?" · In ritardo":"")+'</div><div class="contact-details"><span>Tipo: '+escapeHtml(({task:"Attività",call:"Telefonata",meeting:"Appuntamento",email:"Email",reminder:"Promemoria"})[x.activityType]||"Attività")+'</span>'+(x.dueDate?'<span>Data: '+escapeHtml(x.dueDate)+(x.time?" · "+escapeHtml(x.time):"")+'</span>':"")+(c?'<span>Contatto: '+escapeHtml(c.name)+'</span>':"")+(x.notes?'<span>'+escapeHtml(x.notes)+'</span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary act-edit" data-id="'+x.id+'">Modifica</button>'+(x.status!=="done"?'<button class="action secondary act-done" data-id="'+x.id+'">Completa</button>':"")+'<button class="action danger act-delete" data-id="'+x.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessuna attività corrisponde ai filtri.</div>')+'</div>';
 document.getElementById("activity-form").onsubmit=async e=>{e.preventDefault();const name=document.getElementById("act-name").value.trim();if(!name)return;const item={type:"activities",name,activityType:document.getElementById("act-type").value,status:document.getElementById("act-status").value,priority:document.getElementById("act-priority").value,dueDate:document.getElementById("act-date").value,time:document.getElementById("act-time").value,contactId:document.getElementById("act-contact").value?Number(document.getElementById("act-contact").value):null,notes:document.getElementById("act-notes").value.trim()};if(editing){item.id=editing.id;item.createdAt=editing.createdAt;item.updatedAt=new Date().toISOString();await updateRecord(item)}else await addRecord(item);editingActivityId=null;activitySearch="";await render()};
 const cancel=document.getElementById("act-cancel");if(cancel)cancel.onclick=()=>{editingActivityId=null;render()};
 document.getElementById("act-search").oninput=e=>{activitySearch=e.target.value;const p=e.target.selectionStart;render().then(()=>{const el=document.getElementById("act-search");el.focus();el.setSelectionRange(p,p)})};
 document.getElementById("act-filter").onchange=e=>{activityFilter=e.target.value;render()};
 root.querySelectorAll(".act-edit").forEach(b=>b.onclick=()=>{editingActivityId=Number(b.dataset.id);render()});
 root.querySelectorAll(".act-done").forEach(b=>b.onclick=async()=>{const item=items.find(x=>x.id===Number(b.dataset.id));if(item){item.status="done";item.updatedAt=new Date().toISOString();await updateRecord(item);await render()}});
 root.querySelectorAll(".act-delete").forEach(b=>b.onclick=async()=>{if(confirm("Eliminare definitivamente questa attività?")){await deleteRecord(Number(b.dataset.id));await render()}});
}


let documentSearch="",documentFilter="all";
async function renderDocuments(records){
 const root=document.getElementById("view"),docs=records.filter(r=>r.type==="documents"),contacts=records.filter(r=>r.type==="contacts"),activities=records.filter(r=>r.type==="activities"),term=documentSearch.trim().toLocaleLowerCase();
 const filtered=docs.filter(d=>(documentFilter==="all"||d.category===documentFilter)&&[d.name,d.fileName,d.notes,contacts.find(c=>c.id===d.contactId)?.name].join(" ").toLocaleLowerCase().includes(term));
 const contactOptions='<option value="">— Nessun contatto —</option>'+contacts.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
 const activityOptions='<option value="">— Nessuna attività —</option>'+activities.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join("");
 root.innerHTML='<div class="panel"><h2>Carica un documento</h2><p class="muted">I file vengono conservati nell’archivio locale di questo dispositivo. Puoi includerli nel backup JSON.</p><form id="document-form"><div class="form-grid"><div class="form-wide"><label class="form-label" for="doc-name">Titolo documento *</label><input class="field" id="doc-name" required maxlength="180" placeholder="Es. Contratto cliente"></div><div><label class="form-label" for="doc-category">Categoria</label><select class="field" id="doc-category"><option value="general">Generale</option><option value="invoice">Fattura</option><option value="contract">Contratto</option><option value="offer">Preventivo</option><option value="order">Ordine</option><option value="other">Altro</option></select></div><div><label class="form-label" for="doc-date">Data documento</label><input class="field" id="doc-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div><div><label class="form-label" for="doc-contact">Contatto collegato</label><select class="field" id="doc-contact">'+contactOptions+'</select></div><div><label class="form-label" for="doc-activity">Attività collegata</label><select class="field" id="doc-activity">'+activityOptions+'</select></div><div class="form-wide"><label class="form-label" for="doc-file">File (massimo 10 MB)</label><input class="field" id="doc-file" type="file" required></div><div class="form-wide"><label class="form-label" for="doc-notes">Note</label><textarea class="field" id="doc-notes" rows="2" maxlength="1000"></textarea></div></div><div class="toolbar"><button class="action" type="submit">Archivia documento</button></div></form></div><div class="panel"><div class="panel-heading"><div><h2>Archivio documenti</h2><p class="muted">'+filtered.length+' documenti</p></div></div><input class="field" id="doc-search" type="search" placeholder="Cerca titolo, file, contatto o note" value="'+escapeHtml(documentSearch)+'"><select class="field" id="doc-filter"><option value="all">Tutte le categorie</option>'+["general:Generale","invoice:Fattura","contract:Contratto","offer:Preventivo","order:Ordine","other:Altro"].map(x=>{const p=x.split(":");return '<option value="'+p[0]+'" '+(documentFilter===p[0]?"selected":"")+'>'+p[1]+'</option>'}).join("")+'</select>'+(filtered.length?filtered.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(d=>{const c=contacts.find(x=>x.id===d.contactId),a=activities.find(x=>x.id===d.activityId);return '<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(d.name)+'</strong><div class="muted">'+escapeHtml(d.fileName||"File")+' · '+escapeHtml(d.category||"Generale")+' · '+escapeHtml(d.date||"")+'</div><div class="contact-details">'+(c?'<span>Contatto: '+escapeHtml(c.name)+'</span>':"")+(a?'<span>Attività: '+escapeHtml(a.name)+'</span>':"")+(d.notes?'<span>'+escapeHtml(d.notes)+'</span>':"")+'</div></div></div><div class="contact-actions"><a class="action secondary" href="'+escapeHtml(d.dataUrl||"#")+'" download="'+escapeHtml(d.fileName||"documento")+'">Scarica</a><button class="action danger doc-delete" data-id="'+d.id+'">Elimina</button></div></article>'}).join(""):'<div class="empty">Nessun documento archiviato.</div>')+'</div>';
 document.getElementById("document-form").onsubmit=async e=>{e.preventDefault();const file=document.getElementById("doc-file").files[0],name=document.getElementById("doc-name").value.trim();if(!file||!name)return;if(file.size>10*1024*1024){alert("Il file supera il limite di 10 MB.");return}const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)});await addRecord({type:"documents",name,fileName:file.name,mimeType:file.type||"application/octet-stream",fileSize:file.size,dataUrl,category:document.getElementById("doc-category").value,date:document.getElementById("doc-date").value,contactId:document.getElementById("doc-contact").value?Number(document.getElementById("doc-contact").value):null,activityId:document.getElementById("doc-activity").value?Number(document.getElementById("doc-activity").value):null,notes:document.getElementById("doc-notes").value.trim()});await render()};
 document.getElementById("doc-search").oninput=e=>{documentSearch=e.target.value;const p=e.target.selectionStart;render().then(()=>{const el=document.getElementById("doc-search");el.focus();el.setSelectionRange(p,p)})};
 document.getElementById("doc-filter").onchange=e=>{documentFilter=e.target.value;render()};
 root.querySelectorAll(".doc-delete").forEach(b=>b.onclick=async()=>{if(confirm("Eliminare il documento archiviato?")){await deleteRecord(Number(b.dataset.id));await render()}});
}

async function renderCashBook(records){
 const root=document.getElementById("view"),entries=records.filter(r=>r.type==="cash_entry"),editing=entries.find(x=>x.id===editingCashEntryId),v=k=>editing?(editing[k]??""):"";
 const term=cashBookSearch.trim().toLocaleLowerCase(),filtered=entries.filter(x=>(cashBookFilter==="all"||x.direction===cashBookFilter)&&[x.description,x.category,x.reference,x.method].join(" ").toLocaleLowerCase().includes(term));
 const income=filtered.filter(x=>x.direction==="in").reduce((n,x)=>n+(Number(x.amount)||0),0),expense=filtered.filter(x=>x.direction==="out").reduce((n,x)=>n+(Number(x.amount)||0),0);
 const methods=["Contanti","Bonifico","Carta","Assegno","Altro"],categories=["Vendita","Incasso fattura","Acquisto","Spesa operativa","Trasporto","Imposte e contributi","Stipendi","Altro"];
 root.innerHTML='<div class="grid"><div class="metric"><small>Entrate (filtro attuale)</small><strong>'+invoiceFmt(income)+'</strong></div><div class="metric"><small>Uscite (filtro attuale)</small><strong>'+invoiceFmt(expense)+'</strong></div><div class="metric"><small>Saldo netto (filtro attuale)</small><strong>'+invoiceFmt(income-expense)+'</strong></div></div>'+
 '<div class="panel"><h2>'+(editing?"Modifica movimento":"Nuova registrazione")+'</h2><p class="muted">Prima nota semplice: annota entrate e uscite di cassa o banca. Le registrazioni sono indipendenti dalle fatture.</p><form id="cash-form"><div class="form-grid">'+
 '<div><label class="form-label">Movimento</label><select class="field" id="cash-direction"><option value="in" '+(v("direction")!=="out"?"selected":"")+'>Entrata</option><option value="out" '+(v("direction")==="out"?"selected":"")+'>Uscita</option></select></div>'+
 '<div><label class="form-label">Data *</label><input class="field" id="cash-date" type="date" required value="'+escapeHtml(v("date")||new Date().toISOString().slice(0,10))+'"></div>'+
 '<div class="form-wide"><label class="form-label">Descrizione *</label><input class="field" id="cash-description" maxlength="180" required value="'+escapeHtml(v("description"))+'" placeholder="Es. Incasso cliente / pagamento fornitore"></div>'+
 '<div><label class="form-label">Categoria</label><select class="field" id="cash-category">'+categories.map(c=>'<option '+((v("category")||"Altro")===c?"selected":"")+'>'+c+'</option>').join("")+'</select></div>'+
 '<div><label class="form-label">Metodo</label><select class="field" id="cash-method">'+methods.map(m=>'<option '+((v("method")||"Bonifico")===m?"selected":"")+'>'+m+'</option>').join("")+'</select></div>'+
 '<div><label class="form-label">Importo (€) *</label><input class="field" id="cash-amount" type="number" min="0.01" step="0.01" required value="'+escapeHtml(v("amount"))+'" placeholder="0,00"></div>'+
 '<div><label class="form-label">Riferimento</label><input class="field" id="cash-reference" maxlength="120" value="'+escapeHtml(v("reference"))+'" placeholder="Numero documento o operazione"></div>'+
 '<div class="form-wide"><label class="form-label">Note</label><textarea class="field" id="cash-notes" rows="2" maxlength="1000">'+escapeHtml(v("notes"))+'</textarea></div></div><div class="toolbar"><button class="action" type="submit">'+(editing?"Salva modifiche":"Registra movimento")+'</button>'+(editing?'<button class="action secondary" id="cash-cancel" type="button">Annulla</button>':"")+'</div></form></div>'+
 '<div class="panel"><h2>Prima nota</h2><input class="field" id="cash-search" type="search" placeholder="Cerca descrizione, categoria o riferimento" value="'+escapeHtml(cashBookSearch)+'"><select class="field" id="cash-filter"><option value="all">Entrate e uscite</option><option value="in" '+(cashBookFilter==="in"?"selected":"")+'>Solo entrate</option><option value="out" '+(cashBookFilter==="out"?"selected":"")+'>Solo uscite</option></select>'+
 (filtered.length?filtered.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.id-a.id).map(x=>'<article class="contact-card"><div class="contact-main"><div class="contact-info"><strong>'+escapeHtml(x.description)+'</strong><div class="muted">'+(x.direction==="in"?"Entrata":"Uscita")+' · '+escapeHtml(x.category||"Altro")+' · '+escapeHtml(x.method||"—")+'</div><div class="contact-details"><span>Data: '+escapeHtml(x.date||"—")+'</span><span>Importo: '+invoiceFmt(x.amount)+'</span>'+(x.reference?'<span>Rif.: '+escapeHtml(x.reference)+'</span>':"")+(x.notes?'<span>'+escapeHtml(x.notes)+'</span>':"")+'</div></div></div><div class="contact-actions"><button class="action secondary cash-edit" data-id="'+x.id+'">Modifica</button><button class="action danger cash-delete" data-id="'+x.id+'">Elimina</button></div></article>').join(""):'<div class="empty">Nessun movimento registrato.</div>')+'</div>';
 document.getElementById("cash-form").onsubmit=async e=>{e.preventDefault();const amount=Math.round(Number(document.getElementById("cash-amount").value)*100)/100,description=document.getElementById("cash-description").value.trim();if(!description||!Number.isFinite(amount)||amount<=0){alert("Inserisci una descrizione e un importo positivo.");return}const item={type:"cash_entry",direction:document.getElementById("cash-direction").value,date:document.getElementById("cash-date").value,description,category:document.getElementById("cash-category").value,method:document.getElementById("cash-method").value,amount,reference:document.getElementById("cash-reference").value.trim(),notes:document.getElementById("cash-notes").value.trim()};if(editing){item.id=editing.id;item.createdAt=editing.createdAt;item.updatedAt=new Date().toISOString();await updateRecord(item)}else await addRecord(item);editingCashEntryId=null;await render()};
 const cancel=document.getElementById("cash-cancel");if(cancel)cancel.onclick=()=>{editingCashEntryId=null;render()};
 document.getElementById("cash-search").oninput=e=>{cashBookSearch=e.target.value;const p=e.target.selectionStart;render().then(()=>{const el=document.getElementById("cash-search");el.focus();el.setSelectionRange(p,p)})};
 document.getElementById("cash-filter").onchange=e=>{cashBookFilter=e.target.value;render()};
 root.querySelectorAll(".cash-edit").forEach(b=>b.onclick=()=>{editingCashEntryId=Number(b.dataset.id);render()});
 root.querySelectorAll(".cash-delete").forEach(b=>b.onclick=async()=>{if(confirm("Eliminare questa registrazione?")){await deleteRecord(Number(b.dataset.id));render()}});
}

async function render(){
  const root=document.getElementById("view");
  const records=await allRecords();
  if(currentView==="dashboard"){
    const contacts=records.filter(r=>r.type==="contacts"),crm=records.filter(r=>r.type==="crm"),sales=records.filter(r=>r.type==="sales"),purchases=records.filter(r=>r.type==="purchases"),products=records.filter(r=>r.type==="inventory_product"),moves=records.filter(r=>r.type==="inventory_move"),invoices=records.filter(r=>r.type==="invoices"),activities=records.filter(r=>r.type==="activities"),today=new Date().toISOString().slice(0,10);
    const openActivities=activities.filter(a=>a.status!=="done"),lateActivities=openActivities.filter(a=>a.dueDate&&a.dueDate<today),openInvoices=invoices.filter(x=>(Number(x.total)||0)>(Number(x.paid)||0)),invoiceBalance=openInvoices.reduce((n,x)=>n+Math.max(0,(Number(x.total)||0)-(Number(x.paid)||0)),0);
    const stock=products.map(p=>{const qty=moves.filter(m=>m.productId===p.id).reduce((n,m)=>n+(m.direction==="in"?1:-1)*(Number(m.quantity)||0),Number(p.openingStock)||0);return {...p,qty}}),lowStock=stock.filter(p=>p.qty<=(Number(p.minStock)||0));
    const recent=activities.slice().sort((a,b)=>(b.dueDate||"").localeCompare(a.dueDate||"")).slice(0,5);
    root.innerHTML='<div class="grid"><div class="metric"><small>Contatti</small><strong>'+contacts.length+'</strong></div><div class="metric"><small>Opportunità CRM</small><strong>'+crm.filter(x=>!["won","lost"].includes(x.stage)).length+'</strong></div><div class="metric"><small>Attività aperte</small><strong>'+openActivities.length+'</strong></div><div class="metric"><small>Attività in ritardo</small><strong>'+lateActivities.length+'</strong></div><div class="metric"><small>Fatture da saldare</small><strong>'+invoiceFmt(invoiceBalance)+'</strong></div><div class="metric"><small>Articoli sotto scorta</small><strong>'+lowStock.length+'</strong></div></div>'+
    '<div class="panel"><h2>Attenzione richiesta</h2><div class="contact-details">'+(lateActivities.length?'<span>'+lateActivities.length+' attività scadute da completare</span>':'<span>Nessuna attività in ritardo</span>')+(openInvoices.length?'<span>'+openInvoices.length+' fatture con saldo residuo</span>':'<span>Nessuna fattura aperta</span>')+(lowStock.length?'<span>'+lowStock.length+' prodotti da riordinare</span>':'<span>Nessun prodotto sotto scorta</span>')+'</div></div>'+
    '<div class="panel"><h2>Attività recenti</h2>'+(recent.length?recent.map(a=>'<div class="record"><strong>'+escapeHtml(a.name)+'</strong><div class="muted">'+escapeHtml(a.dueDate||"Senza data")+' · '+(a.status==="done"?"Completata":a.status==="doing"?"In corso":"Da fare")+'</div></div>').join(""):'<div class="empty">Non ci sono ancora attività registrate.</div>')+'</div>'+
    '<div class="panel"><h2>Accesso rapido</h2><div class="toolbar">'+[['contacts','Contatti'],['crm','CRM'],['sales','Vendite'],['purchases','Acquisti'],['inventory','Magazzino'],['invoices','Fatturazione'],['activities','Attività'],['documents','Documenti'],['backup','Backup']].map(x=>'<button class="action secondary" data-go="'+x[0]+'">'+x[1]+'</button>').join("")+'</div><p class="muted">I dati di MyERP sono conservati nell’archivio locale di Safari su questo dispositivo.</p></div>';
    root.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>setView(b.dataset.go));
    return;
  }
  if(currentView==="cashbook"){await renderCashBook(records);return}
  if(currentView==="reports"){
    const sales=records.filter(r=>r.type==="sales"),purchases=records.filter(r=>r.type==="purchases"),invoices=records.filter(r=>r.type==="invoices"),crm=records.filter(r=>r.type==="crm"),products=records.filter(r=>r.type==="inventory_product"),moves=records.filter(r=>r.type==="inventory_move");
    const balance=invoices.reduce((n,x)=>n+Math.max(0,(Number(x.total)||0)-(Number(x.paid)||0)),0);
    const pipeline=crm.filter(x=>!["won","lost"].includes(x.stage)).reduce((n,x)=>n+(Number(x.expectedRevenue)||0)*(Number(x.probability)||0)/100,0);
    const stockValue=products.reduce((n,p)=>{const qty=moves.filter(m=>m.productId===p.id).reduce((v,m)=>v+(m.direction==="in"?1:-1)*(Number(m.quantity)||0),Number(p.openingStock)||0);return n+Math.max(0,qty)*(Number(p.purchasePrice)||0)},0);
    const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(5-i));const key=d.toISOString().slice(0,7);const sum=arr=>arr.filter(x=>(x.date||"").slice(0,7)===key).reduce((n,x)=>n+(Number(x.total)||0),0);return {key,label:d.toLocaleDateString("it-IT",{month:"short",year:"numeric"}),sales:sum(sales),purchases:sum(purchases)}});
    root.innerHTML='<div class="grid"><div class="metric"><small>Vendite registrate</small><strong>'+invoiceFmt(sales.reduce((n,x)=>n+(Number(x.total)||0),0))+'</strong></div><div class="metric"><small>Acquisti registrati</small><strong>'+invoiceFmt(purchases.reduce((n,x)=>n+(Number(x.total)||0),0))+'</strong></div><div class="metric"><small>Crediti aperti fatture</small><strong>'+invoiceFmt(balance)+'</strong></div><div class="metric"><small>Valore ponderato CRM</small><strong>'+invoiceFmt(pipeline)+'</strong></div><div class="metric"><small>Valore stimato magazzino</small><strong>'+invoiceFmt(stockValue)+'</strong></div></div>'+
    '<div class="panel"><h2>Andamento ultimi 6 mesi</h2><p class="muted">Confronto tra documenti di vendita e acquisto in base alla data del documento. Importi IVA inclusa.</p><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Mese</th><th>Vendite</th><th>Acquisti</th><th>Differenza</th></tr></thead><tbody>'+months.map(m=>'<tr><td>'+escapeHtml(m.label)+'</td><td>'+invoiceFmt(m.sales)+'</td><td>'+invoiceFmt(m.purchases)+'</td><td>'+invoiceFmt(m.sales-m.purchases)+'</td></tr>').join("")+'</tbody></table></div></div>'+
    '<div class="panel"><h2>Indicatori generali</h2><div class="contact-details"><span>Preventivi e ordini: '+sales.length+'</span><span>Ordini di acquisto: '+purchases.length+'</span><span>Fatture: '+invoices.length+'</span><span>Opportunità CRM: '+crm.length+'</span><span>Prodotti in anagrafica: '+products.length+'</span></div><p class="muted">Questi report sono riepiloghi gestionali, non sostituiscono una contabilità fiscale o un bilancio ufficiale.</p></div>';
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
  if(currentView==="purchases"){await renderPurchases(records);return}
  if(currentView==="inventory"){await renderInventory(records);return}
  if(currentView==="invoices"){await renderInvoices(records);return}
  if(currentView==="activities"){await renderActivities(records);return}
  if(currentView==="documents"){await renderDocuments(records);return}
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