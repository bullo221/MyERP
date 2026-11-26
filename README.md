# MyERP

Progetto personale di gestionale offline per iPad, con possibilità di trasferire un backup su iPhone.

## Obiettivo

Realizzare un gestionale ispirato ai flussi e ai moduli di Odoo Community, utilizzabile principalmente su iPad senza connessione Internet. L'iPhone sarà un dispositivo secondario aggiornato su richiesta tramite esportazione e ripristino di un backup.

## Vincoli concordati

- Uso personale, un solo proprietario.
- Nessun server a pagamento.
- Nessun CloudKit.
- Nessun abbonamento obbligatorio.
- Database operativo locale sul dispositivo principale.
- Backup manuale su iCloud Drive tramite l'app File.
- Trasferimento del backup su iPhone solo quando richiesto.
- Nessun dato aziendale nel repository GitHub.

## Architettura da validare

La soluzione candidata è un'applicazione web installabile (PWA) con:
- interfaccia responsive ispirata a Odoo;
- archivio locale tramite IndexedDB;
- funzionamento offline dopo la prima installazione e il primo caricamento;
- esportazione e importazione di backup cifrati, trasferibili con iCloud Drive;
- controlli di versione e integrità del backup per evitare ripristini accidentali di copie obsolete.

## Limiti importanti

Questo progetto non esegue il server Odoo originale: Odoo Community richiede un ambiente server e PostgreSQL. MyERP sarà un'applicazione autonoma che riprende concetti e flussi gestionali, non un clone binario o una copia integrale del codice Odoo.

Il backup su iCloud Drive è un trasferimento manuale di file, non una sincronizzazione automatica. Se iPad e iPhone vengono modificati separatamente, occorre scegliere quale backup ripristinare; non è prevista fusione automatica delle modifiche.

Una PWA necessita di un'origine HTTPS per la prima installazione e per il service worker. Prima di implementare, va verificato un modo gratuito e sufficientemente privato per distribuire i file dell'app. Non si devono caricare dati reali o sensibili su servizi pubblici.

## Moduli previsti

1. Dashboard
2. Clienti e fornitori
3. Prodotti e listini
4. Preventivi e vendite
5. Acquisti
6. Magazzino
7. Fatture e pagamenti
8. Documenti e allegati
9. Attività e calendario
10. Impostazioni, esportazione e ripristino

## Fasi

1. Validare la modalità di installazione offline su iPad senza costi.
2. Creare la struttura tecnica e il modello dati.
3. Implementare prima anagrafiche e backup/restore.
4. Verificare il trasferimento del backup su iPhone.
5. Aggiungere gli altri moduli uno alla volta.

## Sicurezza

- Non inserire dati aziendali, credenziali, token o backup in GitHub.
- Implementare cifratura del backup lato client prima di considerarlo pronto per dati reali.
- Prevedere verifica d'integrità e conferma esplicita prima di sovrascrivere dati.
- Mantenere copie di backup indipendenti quando possibile.
