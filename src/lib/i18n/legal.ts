/**
 * Documenti legali (privacy, termini di servizio, politica di rimborso) e
 * relative traduzioni.
 *
 * Perché un modulo separato e non il dizionario: `dictionaries.ts` finisce nel
 * bundle client (lo importa `LanguageProvider`), mentre questi testi servono solo
 * alle pagine server-rendered `/privacy`, `/terms` e `/refunds`. Qui vivono i
 * documenti per esteso (IT ed EN) e le traduzioni complete ES/DE/FR; il dizionario
 * conserva soltanto i link incrociati e `backHome`.
 *
 * `LegalTranslation` non è `Partial`: una traduzione incompleta è un errore di
 * compilazione, non una frase italiana o inglese che compare sotto un'altra
 * lingua.
 */
import { getDictionary } from "./dictionaries";
import type { Locale } from "./constants";

export type LegalDocumentKey = "privacy" | "terms" | "refunds";

export type LegalDocument = {
  backHome: string;
  title: string;
  lastUpdated: string;
  sections: { heading: string; paragraphs: string[] }[];
};

type LegalTranslation = Omit<LegalDocument, "backHome">;

const IT: Record<LegalDocumentKey, LegalTranslation> = {
  privacy: {
    title: "Informativa Privacy",
    lastUpdated: "Ultimo aggiornamento: settembre 2026",
    sections: [
      {
        heading: "1. Chi siamo e titolare del trattamento",
        paragraphs: [
          "AgentCloud (\"AgentCloud\", \"noi\") gestisce il sito e la piattaforma disponibili su agentcloud.agency e nei relativi sottodomini (il \"Servizio\"). AgentCloud è il titolare del trattamento dei dati personali descritti in questa informativa.",
          "Per qualsiasi questione relativa alla privacy, compreso l'esercizio dei tuoi diritti, puoi scriverci a privacy@agentcloud.agency; per richieste di assistenza l'indirizzo è support@agentcloud.agency. Rispondiamo alle richieste privacy entro 30 giorni.",
          "Questa informativa riguarda il nostro sito, la piattaforma AgentCloud e gli agenti AI a cui ti abboni. Non riguarda i siti e i servizi di terze parti che scegli di collegare ad AgentCloud: per quelli valgono le rispettive informative.",
        ],
      },
      {
        heading: "2. Che cosa fa AgentCloud",
        paragraphs: [
          "AgentCloud è una piattaforma no-code che permette alle aziende di attivare e gestire agenti AI. Crei un account, scegli gli agenti dal marketplace, colleghi gli strumenti che già usi (per esempio Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion o HubSpot) e conversi con gli agenti dall'interfaccia web.",
          "Per erogare il servizio trattiamo i dati dell'account, i dati di fatturazione, i messaggi che scambi con gli agenti, i dati che gli strumenti collegati trasmettono agli agenti e i dati tecnici necessari a mantenere la piattaforma sicura e a misurare il consumo.",
        ],
      },
      {
        heading: "3. Informazioni che raccogliamo",
        paragraphs: [
          "Dati dell'account e del profilo: nome, indirizzo email, immagine del profilo (se accedi con Google), metodo di autenticazione, lingua e preferenze dell'interfaccia, data di creazione e stato dell'account.",
          "Dati di autenticazione: la registrazione e l'accesso sono gestiti da Supabase Auth. Se ti registri con email e password, la password è conservata dal fornitore di autenticazione solo come hash con salt: non la vediamo e non la memorizziamo mai in chiaro. Se accedi con Google riceviamo da Google nome, indirizzo email e immagine del profilo.",
          "Dati di fatturazione: piano e agenti sottoscritti, importi, valuta, fatture, stato del pagamento, paese di fatturazione e tipo di metodo di pagamento (per esempio carta, Klarna o Amazon Pay). I numeri di carta e le credenziali di pagamento complete sono raccolti e conservati direttamente dai nostri processori di pagamento (Stripe e PayPal): non transitano mai sui server di AgentCloud, che ricevono solo un token, il circuito della carta e le ultime cifre.",
          "Dati delle conversazioni e di utilizzo: i messaggi che invii agli agenti, le risposte generate, gli strumenti o le integrazioni che l'agente usa per tuo conto, il numero di token consumati e le relative date. Questi dati servono a generare le risposte, applicare i limiti del piano e fatturare il consumo extra.",
          "Dati delle integrazioni collegate: quando colleghi uno strumento di terze parti conserviamo i token OAuth di accesso e rinnovo che autorizzi (cifrati a riposo) e i pochi metadati necessari a identificare la connessione (per esempio il dominio dello shop per Shopify). Le azioni dell'agente vengono eseguite con quei token solo quando le avvii.",
          "Dati dei form e delle comunicazioni: nome, cognome, indirizzo email e contenuto del messaggio quando usi il modulo di contatto, richiedi una demo o ti iscrivi alla lista d'attesa.",
          "Dati tecnici e di sicurezza: indirizzo IP, user agent e metadati delle richieste, usati per il rate limiting, la prevenzione degli abusi, la diagnostica degli errori e i log di sicurezza.",
        ],
      },
      {
        heading: "4. Come raccogliamo le informazioni",
        paragraphs: [
          "Direttamente da te, quando crei un account, sottoscrivi un abbonamento, conversi con un agente, colleghi un'integrazione o compili uno dei nostri moduli.",
          "Dal provider di identità che scegli, per esempio Google, oppure dai servizi di terze parti che colleghi, che ci trasmettono i dati necessari all'agente per eseguire l'operazione che hai richiesto.",
          "Automaticamente, dal tuo browser o dispositivo, tramite i cookie e le tecnologie simili descritti nella sezione 8.",
        ],
      },
      {
        heading: "5. Perché usiamo i tuoi dati e con quale base giuridica",
        paragraphs: [
          "Per fornire il Servizio che hai richiesto (esecuzione del contratto): creare e gestire l'account, eseguire gli agenti sottoscritti, conservare la cronologia delle conversazioni, applicare i limiti di piano e di token e offrire assistenza.",
          "Per gestire i pagamenti e rispettare gli obblighi fiscali e contabili (contratto e obbligo di legge): emettere fatture, gestire rimborsi, prevenire frodi nei pagamenti e conservare la documentazione contabile.",
          "Per mantenere la piattaforma sicura e affidabile (interesse legittimo): rate limiting, prevenzione di abusi e frodi, log di sicurezza, diagnostica degli errori e protezione dell'infrastruttura.",
          "Per inviare email transazionali e comunicazioni sull'account (contratto): messaggi di benvenuto, ricevute, avvisi di abbonamento e di consumo, allerte di sicurezza. Non inviamo email di marketing senza il tuo consenso e puoi disiscriverti dalle comunicazioni non essenziali in qualsiasi momento.",
          "Per migliorare il Servizio (interesse legittimo): statistiche aggregate su utilizzo ed errori, per correggere i problemi e dare priorità alle funzionalità. Non usiamo i contenuti delle chat per addestrare modelli.",
          "Per rispettare la legge (obbligo di legge): rispondere a richieste legittime delle autorità e conservare i documenti che siamo tenuti a mantenere.",
        ],
      },
      {
        heading: "6. Trattamento AI delle conversazioni",
        paragraphs: [
          "Le risposte degli agenti sono generate da un modello linguistico di terze parti (Anthropic Claude). Il contenuto dei tuoi messaggi, il contesto pertinente della conversazione e i risultati degli strumenti collegati vengono trasmessi al fornitore del modello esclusivamente per generare la risposta che hai richiesto.",
          "Né noi né il nostro fornitore del modello usiamo i contenuti delle conversazioni per addestrare modelli di intelligenza artificiale. Le conversazioni non vengono vendute e non sono usate per finalità pubblicitarie.",
          "Non inviare agli agenti categorie particolari di dati (per esempio dati sulla salute) né dati che non sei autorizzato a condividere: gli agenti sono strumenti di automazione generalisti e non sono progettati per contenuti di questo tipo.",
        ],
      },
      {
        heading: "7. Condivisione dei dati",
        paragraphs: [
          "Non vendiamo i tuoi dati personali e non li condividiamo con terze parti per finalità di marketing proprio di queste ultime.",
          "Condividiamo i dati con i fornitori di servizi (responsabili del trattamento) che gestiscono il Servizio per nostro conto: Supabase (database e autenticazione); Stripe e PayPal (pagamenti, fatturazione e rimborsi); Resend (invio delle email transazionali); Anthropic (inferenza del modello AI); Google (accesso con account Google e, se li colleghi, Gmail, Google Calendar e Google Sheets); il fornitore dell'integrazione che scegli di collegare (per esempio Shopify, Slack, Notion, HubSpot); Vercel (hosting e statistiche web aggregate).",
          "Questi fornitori possono accedere ai dati personali solo per erogare il servizio per nostro conto, in base a un contratto, e sono tenuti a proteggerli. L'elenco aggiornato dei responsabili è disponibile su richiesta a privacy@agentcloud.agency.",
          "Possiamo inoltre comunicare i dati quando è richiesto dalla legge, per adempiere a un obbligo legale o per tutelare i diritti, la sicurezza e l'incolumità di AgentCloud, dei nostri utenti o del pubblico.",
          "In caso di fusione, acquisizione o cessione di azienda o ramo d'azienda, i dati potrebbero essere trasferiti al soggetto subentrante; in quel caso te lo comunicheremo e questa informativa continuerà ad applicarsi ai tuoi dati fino al suo aggiornamento.",
        ],
      },
      {
        heading: "8. Cookie e tecnologie simili",
        paragraphs: [
          "Usiamo un numero limitato di cookie, tutti necessari al funzionamento del Servizio. I cookie di autenticazione di Supabase mantengono la sessione attiva. Un cookie di preferenza memorizza la lingua e uno il tema chiaro/scuro, così il sito si apre con la lingua e l'aspetto corretti. Un cookie di breve durata viene impostato durante i flussi di lista d'attesa e di autorizzazione OAuth, per proteggerli da falsificazioni.",
          "Alcune informazioni sono salvate localmente nel browser anziché in un cookie, per esempio il contenuto del carrello. Puoi cancellarle svuotando il carrello o eliminando i dati del browser.",
          "Usiamo Vercel Analytics e Speed Insights per capire il traffico aggregato e le prestazioni. Sono strumenti rispettosi della privacy e non usano cookie per profilarti su più siti; non utilizziamo cookie pubblicitari o di tracciamento cross-site. Poiché utilizziamo solo tecnologie tecnicamente necessarie e misurazioni aggregate, non è richiesto un banner di consenso; puoi comunque bloccare i cookie dalle impostazioni del browser, tenendo presente che alcune parti del Servizio (per esempio la sessione di accesso) smetteranno di funzionare.",
        ],
      },
      {
        heading: "9. Trasferimenti internazionali di dati",
        paragraphs: [
          "Alcuni dei nostri fornitori si trovano fuori dallo Spazio Economico Europeo, in particolare negli Stati Uniti (per esempio Vercel, Supabase, Anthropic e Stripe). Quando i dati personali sono trasferiti fuori dal SEE ci basiamo sulle Clausole Contrattuali Standard della Commissione europea e, ove applicabile, sulla certificazione del fornitore rispetto all'EU-US Data Privacy Framework, insieme a misure tecniche come la cifratura in transito e a riposo.",
        ],
      },
      {
        heading: "10. Per quanto tempo conserviamo i dati",
        paragraphs: [
          "Dati dell'account e del profilo: finché l'account è attivo e fino a 30 giorni dopo la sua cancellazione, per completare l'eliminazione anche dalle copie di backup.",
          "Cronologia delle conversazioni e registrazioni di utilizzo: fino a 12 mesi, oppure fino alla cancellazione della conversazione o dell'account, se anteriore.",
          "Documenti di fatturazione, contabili e fiscali: per 10 anni, come richiesto dalla normativa fiscale italiana, anche dopo la chiusura dell'account.",
          "Token delle integrazioni: fino alla disconnessione dell'integrazione o alla cancellazione dell'account e comunque rimossi dal lato del fornitore quando revochi l'autorizzazione. I token sono cifrati a riposo.",
          "Richieste di lista d'attesa, contatto e demo: fino a 24 mesi dall'ultimo contatto.",
          "Log di sicurezza e contatori di rate limiting: per un massimo di 12 mesi (i contatori sono in genere conservati da poche ore a pochi giorni).",
        ],
      },
      {
        heading: "11. Sicurezza",
        paragraphs: [
          "Proteggiamo i tuoi dati con misure tecniche e organizzative: cifratura TLS in transito, cifratura AES-256-GCM dei token OAuth di terze parti a riposo, regole di accesso al database (row level security) che limitano i dati all'account proprietario, segreti cifrati gestiti solo lato server, accesso ai sistemi secondo il principio del minimo privilegio e rate limiting contro gli abusi.",
          "Nessun metodo di trasmissione o conservazione è sicuro al 100%. Se veniamo a conoscenza di una violazione dei dati personali che comporta un rischio per i tuoi diritti, ti informeremo e notificheremo l'autorità di controllo competente senza ingiustificato ritardo.",
        ],
      },
      {
        heading: "12. I tuoi diritti",
        paragraphs: [
          "Se ti trovi nello Spazio Economico Europeo (o in un'altra giurisdizione con regole equivalenti) hai il diritto di: accedere ai tuoi dati personali e riceverne copia; ottenere la rettifica dei dati inesatti; ottenere la cancellazione dei dati quando non esiste un obbligo legale prevalente di conservarli; limitare od opporti al trattamento, compreso quello basato sull'interesse legittimo; ricevere in un formato strutturato e leggibile da dispositivo automatico i dati che hai fornito (portabilità); revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente.",
          "Per esercitare questi diritti scrivi a privacy@agentcloud.agency dall'indirizzo email del tuo account: rispondiamo entro 30 giorni e non applichiamo alcun costo per una richiesta ragionevole. Puoi anche cancellare l'account direttamente dalle impostazioni del tuo profilo.",
          "Se ritieni che il trattamento dei tuoi dati violi la normativa, puoi proporre reclamo all'autorità di controllo competente — in Italia il Garante per la protezione dei dati personali (www.garanteprivacy.it) — oppure all'autorità del tuo luogo di residenza abituale, di lavoro o del presunto illecito.",
        ],
      },
      {
        heading: "13. Decisioni automatizzate e minori",
        paragraphs: [
          "Non adottiamo decisioni che producono effetti giuridici o analogamente significativi sulla tua persona tramite trattamenti automatizzati senza intervento umano e non ti profilamo per finalità pubblicitarie.",
          "Il Servizio è uno strumento professionale e non è destinato ai minori. Per creare un account devi avere almeno 16 anni (o 14 anni, l'età minima prevista dalla legge italiana per il consenso ai servizi della società dell'informazione). Non raccogliamo consapevolmente dati di minori al di sotto di tale età: se ritieni che un minore ci abbia fornito dati personali, contattaci e li elimineremo.",
        ],
      },
      {
        heading: "14. Modifiche a questa informativa",
        paragraphs: [
          "Possiamo aggiornare questa informativa per riflettere cambiamenti del Servizio, dei nostri fornitori o della legge. In caso di modifiche sostanziali aggiorneremo la data in cima alla pagina e, se la modifica è significativa, ti avviseremo via email o nell'app prima che diventi efficace. Continuare a usare il Servizio dopo l'aggiornamento significa accettare l'informativa aggiornata.",
        ],
      },
      {
        heading: "15. Contatti",
        paragraphs: [
          "Richieste privacy, esercizio dei diritti e segnalazioni di sicurezza: privacy@agentcloud.agency",
          "Assistenza sull'account e sul servizio: support@agentcloud.agency",
        ],
      },
    ],
  },
  terms: {
    title: "Termini di Servizio",
    lastUpdated: "Ultimo aggiornamento: settembre 2026",
    sections: [
      {
        heading: "1. Accettazione dei Termini",
        paragraphs: [
          "Questi Termini di Servizio regolano l'accesso e l'uso di AgentCloud, il sito e la piattaforma disponibili su agentcloud.agency e nei relativi sottodomini (il Servizio), gestiti da AgentCloud (noi). Creando un account, sottoscrivendo un agente o utilizzando il Servizio accetti questi termini.",
          "I termini sono completati dall'Informativa Privacy (come trattiamo i dati personali) e dalla Politica di Rimborso (fatturazione e rimborsi): se non li accetti, non utilizzare il Servizio.",
          "Se accetti per conto di un'azienda o di un'altra organizzazione, dichiari di avere il potere di vincolarla e l'organizzazione è responsabile del rispetto di questi termini.",
        ],
      },
      {
        heading: "2. Descrizione del Servizio",
        paragraphs: [
          "AgentCloud è una piattaforma no-code che permette di attivare e gestire agenti AI. Scegli gli agenti dal marketplace, colleghi gli strumenti che già usi (per esempio Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion o HubSpot) e interagisci con gli agenti dall'interfaccia web. Ogni agente è descritto nella sua pagina prodotto, con le funzioni che usa e il prezzo.",
          "Il Servizio è uno strumento di automazione aziendale e si evolve nel tempo: possiamo aggiungere, modificare o dismettere singoli agenti o funzionalità, senza ridurre in modo sostanziale, durante un periodo già pagato, le funzioni che hai acquistato.",
          "AgentCloud non è uno studio legale, contabile, medico o finanziario e il Servizio non fornisce consulenza professionale.",
        ],
      },
      {
        heading: "3. Registrazione dell'account e sicurezza",
        paragraphs: [
          "Per creare un account serve un indirizzo email valido. L'autenticazione è gestita da Supabase Auth: puoi registrarti con email e password oppure con il tuo account Google.",
          "Devi avere almeno 16 anni (o 14, l'età minima prevista dalla legge italiana per il consenso ai servizi della società dell'informazione) e fornire informazioni corrette. Un account per persona o azienda: sei responsabile di tutto ciò che avviene tramite il tuo account e devi mantenere riservate le credenziali.",
          "Segnalaci subito a support@agentcloud.agency qualsiasi sospetto accesso non autorizzato o incidente di sicurezza che coinvolga il Servizio.",
        ],
      },
      {
        heading: "4. Abbonamenti, fatturazione e tasse",
        paragraphs: [
          "Ogni agente è venduto come abbonamento mensile separato, al prezzo indicato nella pagina dell'agente. Tutti i prezzi sono in EUR e IVA esclusa; l'IVA viene applicata ove richiesta dalla legge. I pagamenti sono gestiti dai nostri fornitori Stripe e PayPal e possono essere effettuati con carta, Klarna, Amazon Pay o altri metodi da loro supportati. Il canone viene addebitato in anticipo ogni mese e l'abbonamento si rinnova automaticamente finché non viene annullato.",
          "Puoi annullare in qualsiasi momento dalla dashboard o dal portale di fatturazione: la cancellazione ha effetto alla fine del periodo corrente, continui ad accedere all'agente fino a quella data e non vieni più addebitato.",
          "Ogni piano include un'allowance mensile di token. Il consumo oltre l'allowance viene addebitato a consumo al costo di €0,30 per 1.000 token aggiuntivi, fino a un tetto di sicurezza pari a 2 volte l'allowance del piano, oltre il quale le esecuzioni vengono sospese.",
          "Se un pagamento viene rifiutato o non va a buon fine, possiamo riprovare l'addebito sul metodo di pagamento in archivio. In caso di mancato pagamento possiamo sospendere l'accesso e, previa comunicazione, terminare l'abbonamento.",
          "Possiamo modificare prezzi e condizioni dei piani: le variazioni vengono comunicate in anticipo e si applicano dal rinnovo successivo. Prezzi, fatture e documenti fiscali sono conservati come descritto nell'Informativa Privacy.",
        ],
      },
      {
        heading: "5. Output degli agenti AI",
        paragraphs: [
          "Gli agenti generano le risposte con un modello linguistico di terze parti (Anthropic Claude). L'output dell'AI può essere inesatto, incompleto o non aggiornato: sei tu a doverlo verificare prima di usarlo e non può essere considerato consulenza legale, fiscale, medica o finanziaria.",
          "Sei responsabile dei messaggi e dei dati che invii agli agenti e delle decisioni che prendi sulla base del loro output. Non inviare categorie particolari di dati personali (per esempio dati sulla salute) né dati che non sei autorizzato a condividere: come vengono trattate le conversazioni — e il fatto che non vengano usate per addestrare modelli — è descritto nell'Informativa Privacy (sezioni 6 e 13).",
          "Le istruzioni che dai a un agente vengono eseguite con le credenziali che hai collegato: mantieni un controllo umano sulle azioni con effetti esterni (email, ordini, fatture, pubblicazioni).",
        ],
      },
      {
        heading: "6. Integrazioni e servizi di terze parti",
        paragraphs: [
          "Per usare un agente può essere necessario collegare servizi di terze parti. Collegando un'integrazione ci autorizzi ad agire su quell'account nei limiti dei permessi che approvi: i token OAuth sono cifrati a riposo e usati solo per eseguire le azioni che avvii.",
          "Dichiari di avere il diritto di collegare quegli account e accetti i termini del fornitore interessato (per esempio Shopify, Google, Slack, Notion, HubSpot, Meta/WhatsApp). I servizi di terze parti non dipendono da noi: disponibilità, prezzi e condizioni possono cambiare e la loro dismissione può limitare il Servizio.",
          "Puoi disconnettere un'integrazione in qualsiasi momento dalla dashboard, interrompendo l'accesso dell'agente.",
        ],
      },
      {
        heading: "7. Uso consentito",
        paragraphs: [
          "Accetti di non: utilizzare il Servizio per scopi illegali o lesivi di diritti di terzi; tentare di aggirare autenticazione, controlli di accesso, limiti di piano o di token; effettuare reverse engineering, decompilazione o estrazione del codice sorgente degli agenti; usare il Servizio per generare spam, molestie, malware, contenuti fuorvianti o comunicazioni illecite; inviare messaggi che imitano in modo ingannevole una persona o un'organizzazione; rivendere o sublicenziare il Servizio senza il nostro consenso scritto; sovraccaricare l'infrastruttura, anche con richieste automatizzate sproporzionate.",
          "Possiamo sospendere gli account che violano queste regole, come descritto nella sezione su sospensione e cessazione.",
        ],
      },
      {
        heading: "8. Proprietà intellettuale",
        paragraphs: [
          "La piattaforma, gli agenti, il marchio e i contenuti che forniamo sono di AgentCloud o dei suoi licenzianti e sono protetti dalla legge: ti concediamo un diritto d'uso limitato, non esclusivo e non trasferibile per la durata dell'abbonamento.",
          "I dati e i contenuti che carichi o generi con gli agenti (dati dei tuoi clienti, preventivi, documenti) restano tuoi. Ci concedi una licenza per trattarli solo nella misura necessaria a erogare il Servizio, come descritto nell'Informativa Privacy.",
          "I suggerimenti che ci invii non sono confidenziali e possono essere usati per migliorare il Servizio.",
        ],
      },
      {
        heading: "9. Disponibilità e assistenza",
        paragraphs: [
          "Lavoriamo per mantenere la piattaforma disponibile e sicura, ma non garantiamo un servizio ininterrotto: manutenzioni, aggiornamenti o problemi dei nostri fornitori possono causare interruzioni temporanee. Salvo accordi scritti per piani enterprise non offriamo un livello di servizio garantito: i rimedi per un'indisponibilità prolungata sono quelli della Politica di Rimborso.",
          "Assistenza: support@agentcloud.agency, in genere entro 24 ore nei giorni lavorativi.",
        ],
      },
      {
        heading: "10. Rimborsi e diritto di recesso",
        paragraphs: [
          "AgentCloud fornisce servizi digitali: ai sensi della normativa europea sui diritti dei consumatori hai 14 giorni di diritto di recesso dall'acquisto, che però decade non appena il servizio inizia con il tuo consenso. Sottoscrivendo acconsenti all'avvio immediato del servizio: gli abbonamenti attivati non sono quindi rimborsabili, salvo i casi indicati nella Politica di Rimborso, che forma parte integrante di questi termini.",
          "In sintesi: addebiti errati o duplicati vengono rimborsati integralmente; un'indisponibilità prolungata imputabile ad AgentCloud viene rimborsata in proporzione al periodo non usufruito; le allowance di token non utilizzate non vengono riportate né rimborsate e i consumi a eccedenza già addebitati non sono rimborsabili.",
          "Come richiederlo e tempi di lavorazione: vedi la Politica di Rimborso (scrivi a legal@agentcloud.agency).",
        ],
      },
      {
        heading: "11. Sospensione e cessazione",
        paragraphs: [
          "Puoi interrompere quando vuoi: annulla l'abbonamento dalla dashboard o dal portale di fatturazione e, se vuoi, elimina l'account dalle impostazioni del profilo. L'annullamento blocca i rinnovi futuri; l'eliminazione dell'account rimuove i tuoi dati come descritto nell'Informativa Privacy (sezione 10), fatti salvi i documenti che dobbiamo conservare per legge.",
          "Possiamo sospendere o terminare il Servizio, con preavviso quando possibile, se: violi questi termini (in particolare l'uso consentito); un pagamento non va a buon fine e non viene regolarizzato; siamo obbligati dalla legge; o continuare a erogare il Servizio creerebbe un rischio legale o di sicurezza. In caso di violazioni gravi possiamo sospendere l'accesso immediatamente.",
          "Alla cessazione il tuo diritto d'uso termina, gli agenti smettono di funzionare e quanto già pagato per il periodo corrente resta dovuto; le clausole che per loro natura sopravvivono (responsabilità, proprietà intellettuale, legge applicabile) continuano ad applicarsi.",
        ],
      },
      {
        heading: "12. Dati personali e privacy",
        paragraphs: [
          "AgentCloud è il titolare del trattamento dei dati personali trattati tramite il Servizio. Quali dati raccogliamo, perché, per quanto tempo li conserviamo, con chi li condividiamo e quali sono i tuoi diritti (accesso, rettifica, cancellazione, limitazione, opposizione, portabilità, revoca del consenso) è descritto nell'Informativa Privacy, che forma parte integrante di questi termini.",
          "Se con gli agenti tratti dati personali dei tuoi clienti, il titolare di quei dati sei tu e noi agiamo come responsabile del trattamento: scrivi a privacy@agentcloud.agency per ricevere il nostro accordo sul trattamento dei dati (DPA).",
          "Per richieste e reclami in materia di privacy puoi rivolgerti anche all'autorità di controllo italiana, il Garante per la protezione dei dati personali.",
        ],
      },
      {
        heading: "13. Limitazione di responsabilità",
        paragraphs: [
          "Il Servizio è fornito così com'è, senza garanzie di alcun tipo nei limiti consentiti dalla legge. Non siamo responsabili di danni indiretti o consequenziali, perdita di profitto, perdita di dati o interruzione dell'attività derivanti dall'uso degli agenti AI, inclusi errori nell'output automatizzato.",
          "Nei limiti consentiti dalla legge, la nostra responsabilità complessiva per pretese legate al Servizio è limitata ai corrispettivi che hai pagato nei 12 mesi precedenti l'evento da cui nasce la pretesa. Nessuna clausola di questi termini esclude o limita i diritti che la normativa a tutela dei consumatori ti riconosce in quanto consumatore, né la nostra responsabilità per dolo o colpa grave.",
        ],
      },
      {
        heading: "14. Modifiche ai Termini",
        paragraphs: [
          "Possiamo aggiornare questi termini per riflettere cambiamenti del Servizio, dei nostri fornitori o della legge. Pubblichiamo la data dell'ultimo aggiornamento in cima a questa pagina e, per modifiche sostanziali, ti avvisiamo via email o nell'app prima che diventino efficaci. Continuare a usare il Servizio dopo l'aggiornamento significa accettare i termini aggiornati.",
        ],
      },
      {
        heading: "15. Legge applicabile e foro competente",
        paragraphs: [
          "Questi termini sono regolati dalla legge italiana, senza pregiudizio delle tutele inderogabili previste nel tuo paese di residenza. Se sei un consumatore puoi agire davanti al giudice del tuo luogo di residenza, di lavoro o di domicilio; negli altri casi è competente il foro italiano.",
          "Se sei un consumatore nell'Unione Europea puoi rivolgerti anche alla rete dei Centri Europei dei Consumatori per informazioni sulla risoluzione extragiudiziale delle controversie.",
        ],
      },
      {
        heading: "16. Contatti",
        paragraphs: [
          "Contratti, fatturazione e rimborsi: legal@agentcloud.agency",
          "Assistenza e account: support@agentcloud.agency",
          "Dati personali e GDPR: privacy@agentcloud.agency",
        ],
      },
    ],
  },
  refunds: {
    title: "Politica di Rimborso",
    lastUpdated: "Ultimo aggiornamento: settembre 2026",
    sections: [
      {
        heading: "1. Servizi digitali e diritto di recesso",
        paragraphs: [
          "AgentCloud fornisce servizi digitali erogati immediatamente. Ai sensi della normativa europea sui diritti dei consumatori hai un diritto di recesso di 14 giorni dall'acquisto, che però decade non appena il servizio inizia con il tuo consenso espresso.",
          "Sottoscrivendo un abbonamento richiedi l'avvio immediato del servizio e prendi atto che gli abbonamenti attivati non sono quindi rimborsabili, salvo i casi descritti in questa politica, che forma parte integrante dei Termini di Servizio.",
        ],
      },
      {
        heading: "2. Casi in cui spetta il rimborso",
        paragraphs: [
          "Rimborsiamo nei seguenti casi:",
          "Addebiti errati o duplicati: l'importo contestato viene rimborsato integralmente, comprese le imposte applicate.",
          "Indisponibilità prolungata imputabile ad AgentCloud: se l'agente sottoscritto non è utilizzabile per cause che dipendono da noi, il rimborso è proporzionale al periodo non usufruito (per esempio 15 giorni di indisponibilità su un abbonamento mensile corrispondono al 50% del canone).",
          "Difetto non risolto: se un agente a pagamento non svolge la funzione descritta nella sua pagina prodotto e non riusciamo a correggere il problema entro 15 giorni dalla segnalazione, rimborsiamo la parte non usufruita del periodo.",
        ],
      },
      {
        heading: "3. Casi in cui il rimborso non spetta",
        paragraphs: [
          "Le allowance di token non utilizzate non vengono riportate al mese successivo né rimborsate.",
          "I consumi a eccedenza già addebitati non sono rimborsabili: corrispondono a elaborazioni che hai effettivamente usato, a €0,30 per 1.000 token aggiuntivi entro il tetto di sicurezza del piano.",
          "Gli abbonamenti attivati e utilizzati non sono rimborsabili al di fuori dei casi precedenti, nemmeno se smetti semplicemente di usare l'agente o dimentichi di annullare prima del rinnovo.",
          "Gli account sospesi per violazione dei Termini di Servizio (per esempio uso illecito o abuso dell'infrastruttura) non danno diritto a rimborso.",
          "Non rimborsiamo i corrispettivi per disservizi causati da servizi di terze parti che hai collegato o dai tuoi sistemi e credenziali.",
        ],
      },
      {
        heading: "4. Come richiedere un rimborso",
        paragraphs: [
          "Scrivi a legal@agentcloud.agency dall'indirizzo email del tuo account indicando: email dell'account, agente o abbonamento interessato, data e importo dell'addebito e motivo della richiesta (con eventuali prove, per esempio messaggi di errore o screenshot).",
          "Valutiamo le richieste entro 5 giorni lavorativi dalla ricezione e rispondiamo con l'esito; se ci servono informazioni aggiuntive il termine decorre dalla tua risposta. Le richieste inviate oltre 60 giorni dall'addebito possono essere respinte, fatti salvi i diritti inderogabili di legge.",
        ],
      },
      {
        heading: "5. Tempi e modalità di erogazione",
        paragraphs: [
          "I rimborsi approvati vengono erogati tramite il metodo di pagamento originale (Stripe o PayPal), in genere entro 5-10 giorni lavorativi a seconda del circuito della carta, di PayPal e della tua banca; i tempi di accredito dipendono dal tuo fornitore.",
          "I rimborsi sono erogati nella stessa valuta dell'addebito (EUR). Non possiamo rimborsare su una carta o un account diversi da quelli usati per il pagamento.",
        ],
      },
      {
        heading: "6. Storni e contestazioni con il gestore del pagamento",
        paragraphs: [
          "Se ritieni che un addebito sia errato, contattaci a legal@agentcloud.agency prima di aprire una contestazione con la tua banca, il circuito della carta o PayPal: quasi sempre riusciamo a risolvere più rapidamente.",
          "Se apri una contestazione, possiamo sospendere l'abbonamento e l'accesso all'agente durante la verifica e fornire al fornitore di pagamento i registri degli addebiti e dei consumi. Se la contestazione viene accolta, il rimborso segue l'iter del fornitore di pagamento.",
        ],
      },
      {
        heading: "7. Legge applicabile e diritti inderogabili",
        paragraphs: [
          "Questa politica è regolata dalla legge italiana. Nessuna sua clausola limita o sostituisce le tutele inderogabili che la normativa a tutela dei consumatori ti riconosce; in caso di contrasto prevale la regola più favorevole al consumatore.",
          "Come consumatore puoi rivolgerti alla tua autorità nazionale per i consumatori, alla rete dei Centri Europei dei Consumatori o, per quanto riguarda i dati personali, al Garante per la protezione dei dati personali. Il foro competente è quello indicato nei Termini di Servizio.",
          "I rapporti di fatturazione tra aziende (B2B) sono regolati dai Termini di Servizio e dall'eventuale ordine sottoscritto.",
        ],
      },
      {
        heading: "8. Contatti",
        paragraphs: [
          "Rimborsi e fatturazione: legal@agentcloud.agency",
          "Assistenza sull'account: support@agentcloud.agency",
        ],
      },
    ],
  },
};

const EN: Record<LegalDocumentKey, LegalTranslation> = {
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: September 2026",
    sections: [
      {
        heading: "1. Who We Are and Data Controller",
        paragraphs: [
          "AgentCloud (\u201cAgentCloud\u201d, \u201cwe\u201d, \u201cus\u201d) operates the website and platform available at agentcloud.agency and its subdomains (the \u201cService\u201d). AgentCloud is the data controller for the personal data described in this policy.",
          "You can contact us for any privacy matter, including exercising your rights, at privacy@agentcloud.agency; for account and product support the address is support@agentcloud.agency. We answer privacy requests within 30 days.",
          "This policy covers our website, the AgentCloud platform and the AI agents you subscribe to. It does not cover third-party websites and services you choose to connect to AgentCloud, which are governed by their own privacy policies.",
        ],
      },
      {
        heading: "2. What AgentCloud Does",
        paragraphs: [
          "AgentCloud is a no-code platform that lets businesses deploy and manage AI agents. You create an account, choose agents from our marketplace, connect the tools you already use (for example Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion or HubSpot), and chat with the agents from our web interface.",
          "To provide this service we process account data, billing data, the messages you exchange with agents, the data your connected tools send to the agents, and the technical data needed to keep the platform secure and to measure usage.",
        ],
      },
      {
        heading: "3. Information We Collect",
        paragraphs: [
          "Account and profile data: name, email address, profile picture (when you sign in with Google), authentication method, language and interface preferences, account creation date and account status.",
          "Authentication data: sign-up and sign-in are handled by Supabase Auth. If you register with email and password, your password is stored by our authentication provider only as a salted hash \u2014 we never see it or store it in plain text. If you sign in with Google, we receive your name, email address and profile picture from Google.",
          "Billing data: the plan and agents you subscribe to, amounts, currency, invoices, payment status, billing country and the type of payment method used (for example card, Klarna or Amazon Pay). Card numbers and full payment credentials are collected and stored directly by our payment processors (Stripe and PayPal); they never pass through or are stored on AgentCloud servers, which only receive a token, the card brand and the last digits.",
          "Conversation and usage data: the messages you send to agents, the responses generated, the tools or integrations the agent uses on your behalf, the number of tokens consumed, and timestamps. This data is needed to deliver responses, enforce plan limits and bill metered overage.",
          "Connected integration data: when you connect a third-party tool we store the OAuth access and refresh tokens you authorise (encrypted at rest) and the small amount of metadata needed to identify the connection (for example the shop domain for Shopify). Agent actions run with those tokens only when you trigger them.",
          "Form and communication data: name, surname, email address and the content of your message when you use our contact form, request a demo, or join the waitlist.",
          "Technical and security data: IP address, user agent and request metadata used for rate limiting, abuse prevention, error diagnostics and security logging.",
        ],
      },
      {
        heading: "4. How We Collect Information",
        paragraphs: [
          "Directly from you, when you create an account, subscribe, chat with an agent, connect an integration, or fill in one of our forms.",
          "From the identity provider you choose, such as Google, or from the third-party services you connect, which send us the data the agent needs to perform the task you asked for.",
          "Automatically, from your browser or device, through the cookies and similar technologies described in section 8.",
        ],
      },
      {
        heading: "5. Why We Use Your Data and Our Legal Bases",
        paragraphs: [
          "To provide the Service you requested (performance of a contract): creating and managing your account, running the agents you subscribed to, storing your conversation history, enforcing plan and token limits, and providing support.",
          "To process payments and comply with tax and accounting obligations (contract and legal obligation): issuing invoices, handling refunds, preventing payment fraud and keeping accounting records.",
          "To keep the platform secure and reliable (legitimate interest): rate limiting, abuse and fraud prevention, security logging, debugging and protecting our infrastructure.",
          "To send transactional and account emails (contract): welcome messages, receipts, subscription and usage notices, security alerts. We do not send marketing emails without your consent, and you can opt out of non-essential communications at any time.",
          "To improve the Service (legitimate interest): aggregate statistics about usage and errors, so that we can fix issues and prioritise features. We do not use your conversation content to train models.",
          "To comply with the law (legal obligation): responding to lawful requests from authorities and retaining records we are required to keep.",
        ],
      },
      {
        heading: "6. AI Processing of Your Conversations",
        paragraphs: [
          "Agent responses are generated by a third-party large language model (Anthropic Claude). The content of your messages, the relevant conversation context and the results of connected tools are transmitted to the model provider solely to generate the response you requested.",
          "Neither we nor our model provider use your conversation content to train AI models. Your conversations are never sold and are not used for advertising.",
          "Do not send agents special categories of data (for example health data) or data you are not allowed to share: the agents are general-purpose automation tools and are not designed for such content.",
        ],
      },
      {
        heading: "7. Sharing and Disclosure",
        paragraphs: [
          "We do not sell your personal data, and we do not share it with third parties for their own marketing purposes.",
          "We share data with the service providers (processors) that operate the Service on our behalf: Supabase (database and authentication); Stripe and PayPal (payments, billing and refunds); Resend (transactional email delivery); Anthropic (AI model inference); Google (sign-in with Google and, when you connect them, Gmail, Google Calendar and Google Sheets); the integration provider you choose to connect (for example Shopify, Slack, Notion or HubSpot); and Vercel (hosting and aggregate web analytics).",
          "These providers may access personal data only to deliver the service for us, under contract, and are required to protect it. A current list of our processors is available on request at privacy@agentcloud.agency.",
          "We may also disclose data where required by law, to comply with a legal obligation, or to protect the rights, safety and security of AgentCloud, our users or the public.",
          "If AgentCloud is involved in a merger, acquisition or sale of assets, data may be transferred to the successor entity; we will notify you and this policy will continue to apply to your data until it is updated.",
        ],
      },
      {
        heading: "8. Cookies and Similar Technologies",
        paragraphs: [
          "We use a small number of cookies, all of them necessary to operate the Service. Supabase authentication cookies keep you signed in. A preference cookie stores your language and another stores your light or dark theme, so the site opens with the right language and appearance. A short-lived cookie is set while you complete a waitlist or OAuth authorisation flow, to protect it against forgery.",
          "Some information is stored locally in your browser rather than in a cookie \u2014 for example the contents of your shopping cart. You can clear it by emptying the cart or clearing your browser storage.",
          "We use Vercel Analytics and Speed Insights to understand aggregate traffic and performance. They are privacy-friendly and do not use cookies to profile you across sites; we do not run advertising or cross-site tracking cookies. Because we only use technically necessary technologies and aggregate measurement, no consent banner is required for them; you can still block cookies in your browser settings, although parts of the Service (such as the login session) will then stop working.",
        ],
      },
      {
        heading: "9. International Data Transfers",
        paragraphs: [
          "Some of our providers are located outside the European Economic Area, in particular in the United States (for example Vercel, Supabase, Anthropic and Stripe). When personal data is transferred outside the EEA we rely on the European Commission's Standard Contractual Clauses and, where applicable, on the provider's EU-US Data Privacy Framework certification, together with technical measures such as encryption in transit and at rest.",
        ],
      },
      {
        heading: "10. How Long We Keep Data",
        paragraphs: [
          "Account and profile data: while your account is active, and up to 30 days after you delete it so that we can complete the deletion across backups.",
          "Conversation history and usage records: for up to 12 months, or until you delete the conversation or your account, whichever comes first.",
          "Invoice, billing and tax records: for 10 years, as required by Italian tax law, even after the subscription is cancelled.",
          "Integration tokens: until you disconnect the integration or delete your account, and in any case removed on the provider side when you revoke access. Tokens are encrypted at rest.",
          "Waitlist, contact and demo requests: for up to 24 months from our last contact.",
          "Security logs and rate-limiting counters: for a maximum of 12 months (counters are typically kept for hours to days).",
        ],
      },
      {
        heading: "11. Security",
        paragraphs: [
          "We protect your data with technical and organisational measures: TLS encryption in transit, AES-256-GCM encryption of third-party OAuth tokens at rest, database access rules (row level security) that scope data to the owning account, encrypted secrets managed only on the server, least-privilege access for our systems, and rate limiting against abuse.",
          "No method of transmission or storage is 100% secure. If we become aware of a personal data breach that is likely to result in a risk to your rights, we will notify you and the competent supervisory authority without undue delay.",
        ],
      },
      {
        heading: "12. Your Rights",
        paragraphs: [
          "If you are in the European Economic Area (or another jurisdiction with equivalent rules) you have the right to: access your personal data and receive a copy; rectify inaccurate data; erase data when there is no overriding legal obligation to keep it; restrict or object to processing, including processing based on legitimate interest; receive the data you provided in a structured, machine-readable format (portability); withdraw consent at any time, without affecting the lawfulness of processing carried out before the withdrawal.",
          "To exercise any of these rights, write to privacy@agentcloud.agency from the email address of your account. We reply within 30 days and never charge a fee for a reasonable request. You can also delete your account directly from your account settings.",
          "If you believe your data is being processed unlawfully, you can lodge a complaint with the competent supervisory authority \u2014 in Italy the Garante per la protezione dei dati personali (www.garanteprivacy.it) \u2014 or with the authority of your habitual residence, place of work or place of the alleged infringement.",
        ],
      },
      {
        heading: "13. Automated Decisions and Children",
        paragraphs: [
          "We do not make decisions that produce legal or similarly significant effects on you through automated processing without human involvement, and we do not profile you for advertising purposes.",
          "The Service is a business tool and is not directed at children. You must be at least 16 years old (or 14, the minimum age set by Italian law for consenting to information society services) to create an account. We do not knowingly collect data from children below that age; if you believe a child has provided us with personal data, contact us and we will delete it.",
        ],
      },
      {
        heading: "14. Changes to This Policy",
        paragraphs: [
          "We may update this policy to reflect changes to the Service, our providers, or the law. When we make material changes we will update the date at the top of this page and, where the change is significant, notify you by email or in the app before it takes effect. Continuing to use the Service after the update means you accept the revised policy.",
        ],
      },
      {
        heading: "15. Contact",
        paragraphs: [
          "Privacy requests, data subject rights and security reports: privacy@agentcloud.agency",
          "Account and service support: support@agentcloud.agency",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    lastUpdated: "Last updated: September 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        paragraphs: [
          "These Terms of Service govern your access to and use of AgentCloud, the website and platform available at agentcloud.agency and its subdomains (the Service), operated by AgentCloud (we, us). By creating an account, subscribing to an agent or using the Service you accept these terms.",
          "These terms are completed by our Privacy Policy (how we process personal data) and Refund Policy (billing and refunds): if you do not accept them, do not use the Service.",
          "If you accept on behalf of a company or another organisation, you confirm you are authorised to bind it, and that organisation is responsible for complying with these terms.",
        ],
      },
      {
        heading: "2. Description of the Service",
        paragraphs: [
          "AgentCloud is a no-code platform that lets you activate and manage AI agents. You choose agents from the marketplace, connect the tools you already use (for example Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion or HubSpot) and interact with the agents through our web interface. Each agent is described on its product page, with the features it uses and its price.",
          "The Service is a business automation tool and evolves over time: we may add, change or discontinue individual agents or features, without materially reducing, during a period you have already paid for, the functionality you purchased.",
          "AgentCloud is not a law firm, accounting firm, medical or financial adviser, and the Service does not provide professional advice.",
        ],
      },
      {
        heading: "3. Account Registration and Security",
        paragraphs: [
          "You need a valid email address to create an account. Authentication is managed by Supabase Auth: you can sign up with email and password or with your Google account.",
          "You must be at least 16 years old (or 14, the minimum age set by Italian law for consenting to information society services) and provide accurate information. One account per person or company: you are responsible for everything that happens through your account and must keep your credentials confidential.",
          "Tell us immediately at support@agentcloud.agency if you suspect unauthorised access to your account or any security incident involving the Service.",
        ],
      },
      {
        heading: "4. Subscriptions, Billing and Taxes",
        paragraphs: [
          "Each agent is sold as a separate monthly subscription at the price shown on the agent page. All prices are in EUR and exclusive of applicable taxes; VAT is applied where required by law. Payments are processed by our providers Stripe and PayPal and can be made by card, Klarna, Amazon Pay or other methods they support. Fees are billed in advance each month and subscriptions renew automatically until cancelled.",
          "You may cancel at any time from the dashboard or the billing portal: cancellation takes effect at the end of the current period, you keep access to the agent until that date and are not charged again.",
          "Each plan includes a monthly token allowance. Usage beyond the allowance is billed on a metered basis at €0.30 per 1,000 extra tokens, up to a safety cap of 2x the plan allowance, beyond which executions are suspended.",
          "If a payment is declined or fails, we may retry the charge on the payment method on file. In case of non-payment we may suspend access and, with prior notice, terminate the subscription.",
          "We may change prices and plan conditions: changes are communicated in advance and apply from the next renewal. Prices, invoices and tax records are retained as described in the Privacy Policy.",
        ],
      },
      {
        heading: "5. AI Agent Output",
        paragraphs: [
          "Agents generate their responses with a third-party large language model (Anthropic Claude). AI output can be inaccurate, incomplete or out of date: you are responsible for reviewing it before relying on it, and it cannot be considered legal, tax, medical or financial advice.",
          "You are responsible for the messages and data you send to the agents and for the decisions you take based on their output. Do not send special categories of personal data (for example health data) or data you are not allowed to share: how conversations are processed - and the fact that they are not used to train models - is described in the Privacy Policy (sections 6 and 13).",
          "The instructions you give an agent run with the credentials you have connected: keep human oversight over actions with external effects (emails, orders, invoices, publications).",
        ],
      },
      {
        heading: "6. Integrations and Third-Party Services",
        paragraphs: [
          "Using an agent may require connecting third-party services. When you connect an integration you authorise us to act on that account within the permissions you approve: OAuth tokens are encrypted at rest and used only to run the actions you trigger.",
          "You confirm you are entitled to connect those accounts and you accept the terms of the relevant provider (for example Shopify, Google, Slack, Notion, HubSpot, Meta/WhatsApp). Third-party services are not controlled by us: their availability, prices and terms can change, and discontinuing an integration on their side may limit the Service.",
          "You can disconnect an integration at any time from the dashboard, which stops the agent from accessing it.",
        ],
      },
      {
        heading: "7. Acceptable Use",
        paragraphs: [
          "You agree not to: use the Service for illegal purposes or to infringe third-party rights; attempt to bypass authentication, access controls, plan or token limits; reverse-engineer, decompile or extract the source code of the agents; use the Service to generate spam, harassment, malware, misleading content or unlawful communications; send messages that deceptively impersonate a person or organisation; resell or sublicense the Service without our written consent; overload the infrastructure, including through disproportionate automated requests.",
          "We may suspend accounts that breach these rules, as described in the section on suspension and termination.",
        ],
      },
      {
        heading: "8. Intellectual Property",
        paragraphs: [
          "The platform, the agents, the brand and the content we provide are owned by AgentCloud or its licensors and protected by law: we grant you a limited, non-exclusive and non-transferable right to use the Service for the duration of your subscription.",
          "The data and content you upload or generate with the agents (your client data, quotes, documents) remain yours. You grant us a licence to process them only to the extent necessary to deliver the Service, as described in the Privacy Policy.",
          "Feedback and suggestions you send us are non-confidential and may be used to improve the Service.",
        ],
      },
      {
        heading: "9. Availability and Support",
        paragraphs: [
          "We work to keep the platform available and secure, but we do not guarantee uninterrupted service: maintenance, updates or problems at our providers can cause temporary interruptions. Unless agreed in writing for enterprise plans we do not offer a guaranteed service level: remedies for prolonged unavailability are those set out in the Refund Policy.",
          "Support: support@agentcloud.agency, generally within 24 hours on business days.",
        ],
      },
      {
        heading: "10. Refunds and Withdrawal Right",
        paragraphs: [
          "AgentCloud provides digital services: under EU consumer law you have a 14-day withdrawal right from purchase, which lapses as soon as the service begins with your consent. By subscribing you consent to the immediate start of the service: activated subscriptions are therefore non-refundable, except in the cases listed in the Refund Policy, which forms an integral part of these terms.",
          "In short: incorrect or duplicate charges are refunded in full; prolonged unavailability attributable to AgentCloud is refunded pro rata for the unused period; unused token allowances do not carry over and metered overage already billed is not refundable.",
          "How to request a refund and processing times: see the Refund Policy (write to legal@agentcloud.agency).",
        ],
      },
      {
        heading: "11. Suspension and Termination",
        paragraphs: [
          "You can stop at any time: cancel the subscription from the dashboard or the billing portal and, if you wish, delete your account from your account settings. Cancellation stops future renewals; deleting the account removes your data as described in the Privacy Policy (section 10), subject to the records we must keep by law.",
          "We may suspend or terminate the Service, with notice where possible, if: you breach these terms (in particular acceptable use); a payment fails and is not settled; we are required to do so by law; or continuing to provide the Service would create a legal or security risk. In case of serious breaches we may suspend access immediately.",
          "On termination your right to use the Service ends, the agents stop working and any fee already paid for the current period remains due; provisions that by their nature survive (liability, intellectual property, applicable law) continue to apply.",
        ],
      },
      {
        heading: "12. Personal Data and Privacy",
        paragraphs: [
          "AgentCloud is the data controller for the personal data processed through the Service. Which data we collect, why, for how long we keep it, who we share it with and your rights (access, rectification, erasure, restriction, objection, portability, withdrawal of consent) are described in the Privacy Policy, which forms an integral part of these terms.",
          "If you process your customers' personal data with the agents, you are the controller of that data and we act as your processor: write to privacy@agentcloud.agency to receive our data processing agreement (DPA).",
          "For privacy requests and complaints you can also contact the Italian supervisory authority, the Garante per la protezione dei dati personali.",
        ],
      },
      {
        heading: "13. Limitation of Liability",
        paragraphs: [
          "The Service is provided as is, without warranties of any kind to the extent permitted by law. We are not liable for indirect or consequential damage, loss of profit, loss of data or business interruption arising from the use of AI agents, including errors in automated output.",
          "To the extent permitted by law, our total liability for claims relating to the Service is limited to the fees you paid in the 12 months before the event giving rise to the claim. Nothing in these terms excludes or limits the rights consumer law grants you as a consumer, or our liability for wilful misconduct or gross negligence.",
        ],
      },
      {
        heading: "14. Changes to the Terms",
        paragraphs: [
          "We may update these terms to reflect changes to the Service, our providers or the law. We publish the date of the last update at the top of this page and, for material changes, we notify you by email or in the app before they take effect. Continuing to use the Service after the update means you accept the revised terms.",
        ],
      },
      {
        heading: "15. Governing Law and Dispute Resolution",
        paragraphs: [
          "These terms are governed by Italian law, without prejudice to the mandatory consumer protections of your country of residence. If you are a consumer you may bring proceedings before the court of your place of residence, work or domicile; otherwise the courts of Italy have jurisdiction.",
          "If you are a consumer in the EU you can also contact the European Consumer Centre network for information on settling a dispute out of court.",
        ],
      },
      {
        heading: "16. Contact",
        paragraphs: [
          "Contracts, billing and refunds: legal@agentcloud.agency",
          "Support and account: support@agentcloud.agency",
          "Personal data and GDPR: privacy@agentcloud.agency",
        ],
      },
    ],
  },
  refunds: {
    title: "Refund Policy",
    lastUpdated: "Last updated: September 2026",
    sections: [
      {
        heading: "1. Digital Services and Withdrawal Right",
        paragraphs: [
          "AgentCloud provides digital services delivered immediately. Under EU consumer law you have a right of withdrawal within 14 days of purchase, which lapses as soon as the service begins with your express consent.",
          "By subscribing you request the immediate start of the service and acknowledge that activated subscriptions are therefore non-refundable, except in the cases described in this policy, which forms an integral part of the Terms of Service.",
        ],
      },
      {
        heading: "2. Cases Where a Refund Is Due",
        paragraphs: [
          "We refund in the following cases:",
          "Incorrect or duplicate charges: the disputed amount is refunded in full, including any tax applied.",
          "Prolonged unavailability attributable to AgentCloud: if the agent you subscribed to cannot be used for reasons depending on us, the refund is prorated for the unused period (for example 15 days of downtime on a monthly subscription correspond to 50% of the fee).",
          "Defect not resolved: if a paid agent does not perform the function described on its product page and we cannot fix it within 15 days of your report, we refund the unused part of the period.",
        ],
      },
      {
        heading: "3. Cases Where a Refund Is Not Due",
        paragraphs: [
          "Unused token allowances do not carry over to the following month and are not refunded.",
          "Metered overage already billed is not refundable: it corresponds to processing you actually used, at €0.30 per 1,000 extra tokens within the plan safety cap.",
          "Activated and used subscriptions are not refundable other than in the cases above, including if you simply stop using the agent or forget to cancel before renewal.",
          "Accounts suspended for breach of the Terms of Service (for example unlawful use or abuse of the infrastructure) are not entitled to a refund.",
          "We do not refund fees for problems caused by third-party services you connected, or by your own systems and credentials.",
        ],
      },
      {
        heading: "4. How to Request a Refund",
        paragraphs: [
          "Write to legal@agentcloud.agency from the email address of your account, including: the account email, the agent or subscription concerned, the charge date and amount, and the reason for your request (with any evidence, for example error messages or screenshots).",
          "We review requests within 5 business days of receipt and reply with the outcome; if we need more information the deadline restarts from your reply. Requests sent more than 60 days after the charge may be declined, subject to mandatory legal rights.",
        ],
      },
      {
        heading: "5. Timing and Method of Refund",
        paragraphs: [
          "Approved refunds are issued through the original payment method (Stripe or PayPal), typically within 5-10 business days depending on the card network, PayPal and your bank; the timing of the credit depends on your provider.",
          "Refunds are issued in the same currency as the charge (EUR). We cannot refund to a card or account different from the one used for payment.",
        ],
      },
      {
        heading: "6. Chargebacks and Payment Disputes",
        paragraphs: [
          "If you believe a charge is wrong, contact us at legal@agentcloud.agency before opening a dispute with your bank, card network or PayPal: we can almost always resolve it faster.",
          "If you open a chargeback, we may suspend the subscription and access to the agent while the dispute is pending, and provide the payment provider with the records of the charges and usage. If the dispute is resolved in your favour, the refund follows the provider's process.",
        ],
      },
      {
        heading: "7. Governing Law and Mandatory Rights",
        paragraphs: [
          "This policy is governed by Italian law. Nothing in it limits or replaces the mandatory protections that consumer law grants you; in case of conflict, the rule most favourable to the consumer prevails.",
          "As a consumer you may turn to your national consumer authority, the European Consumer Centre network, or the Italian Garante per la protezione dei dati personali for matters concerning personal data. The competent courts are those indicated in the Terms of Service.",
          "Billing relationships between companies (B2B) are governed by the Terms of Service and any signed order.",
        ],
      },
      {
        heading: "8. Contact",
        paragraphs: [
          "Refunds and billing: legal@agentcloud.agency",
          "Account support: support@agentcloud.agency",
        ],
      },
    ],
  },
};

const ES: Record<LegalDocumentKey, LegalTranslation> = {
  privacy: {
    title: "Política de privacidad",
    lastUpdated: "Última actualización: septiembre de 2026",
    sections: [
      {
        heading: "1. Quiénes somos y responsable del tratamiento",
        paragraphs: [
          "AgentCloud (AgentCloud, nosotros) gestiona el sitio web y la plataforma disponibles en agentcloud.agency y sus subdominios (el Servicio). AgentCloud es el responsable del tratamiento de los datos personales descritos en esta política.",
          "Puedes escribirnos por cualquier asunto relacionado con la privacidad, incluido el ejercicio de tus derechos, a privacy@agentcloud.agency; para soporte de cuenta y producto la dirección es support@agentcloud.agency. Respondemos a las solicitudes de privacidad en un plazo de 30 días.",
          "Esta política cubre nuestro sitio web, la plataforma AgentCloud y los agentes de IA a los que te suscribes. No cubre los sitios y servicios de terceros que decidas conectar a AgentCloud, que se rigen por sus propias políticas de privacidad.",
        ],
      },
      {
        heading: "2. Qué hace AgentCloud",
        paragraphs: [
          "AgentCloud es una plataforma sin código que permite a las empresas activar y gestionar agentes de IA. Creas una cuenta, eliges agentes en el marketplace, conectas las herramientas que ya usas (por ejemplo Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion o HubSpot) y conversas con los agentes desde nuestra interfaz web.",
          "Para prestar este servicio tratamos datos de la cuenta, datos de facturación, los mensajes que intercambias con los agentes, los datos que las herramientas conectadas envían a los agentes y los datos técnicos necesarios para mantener la plataforma segura y medir el consumo.",
        ],
      },
      {
        heading: "3. Información que recopilamos",
        paragraphs: [
          "Datos de la cuenta y del perfil: nombre, dirección de correo electrónico, imagen de perfil (cuando inicias sesión con Google), método de autenticación, idioma y preferencias de la interfaz, fecha de creación y estado de la cuenta.",
          "Datos de autenticación: el registro y el inicio de sesión los gestiona Supabase Auth. Si te registras con correo y contraseña, nuestro proveedor de autenticación guarda la contraseña únicamente como hash con salt: nunca la vemos ni la almacenamos en claro. Si inicias sesión con Google, recibimos de Google tu nombre, tu correo y tu imagen de perfil.",
          "Datos de facturación: el plan y los agentes suscritos, importes, divisa, facturas, estado del pago, país de facturación y tipo de método de pago utilizado (por ejemplo tarjeta, Klarna o Amazon Pay). Los números de tarjeta y las credenciales de pago completas los recogen y almacenan directamente nuestros procesadores de pago (Stripe y PayPal); nunca pasan por los servidores de AgentCloud, que solo reciben un token, la marca de la tarjeta y los últimos dígitos.",
          "Datos de conversación y uso: los mensajes que envías a los agentes, las respuestas generadas, las herramientas o integraciones que el agente utiliza en tu nombre, el número de tokens consumidos y las marcas temporales. Estos datos son necesarios para generar las respuestas, aplicar los límites del plan y facturar el exceso.",
          "Datos de las integraciones conectadas: cuando conectas una herramienta de terceros almacenamos los tokens OAuth de acceso y renovación que autorizas (cifrados en reposo) y los pocos metadatos necesarios para identificar la conexión (por ejemplo el dominio de la tienda en Shopify). Las acciones del agente se ejecutan con esos tokens solo cuando las inicias tú.",
          "Datos de formularios y comunicaciones: nombre, apellidos, correo electrónico y contenido del mensaje cuando usas el formulario de contacto, solicitas una demo o te apuntas a la lista de espera.",
          "Datos técnicos y de seguridad: dirección IP, user agent y metadatos de las solicitudes, utilizados para el rate limiting, la prevención de abusos, el diagnóstico de errores y los registros de seguridad.",
        ],
      },
      {
        heading: "4. Cómo recopilamos la información",
        paragraphs: [
          "Directamente de ti, cuando creas una cuenta, te suscribes, conversas con un agente, conectas una integración o rellenas uno de nuestros formularios.",
          "Del proveedor de identidad que elijas, como Google, o de los servicios de terceros que conectes, que nos envían los datos que el agente necesita para realizar la tarea que has pedido.",
          "Automáticamente, desde tu navegador o dispositivo, mediante las cookies y tecnologías similares descritas en la sección 8.",
        ],
      },
      {
        heading: "5. Para qué usamos tus datos y con qué base jurídica",
        paragraphs: [
          "Para prestarte el Servicio que has solicitado (ejecución de un contrato): crear y gestionar tu cuenta, ejecutar los agentes suscritos, conservar tu historial de conversaciones, aplicar los límites de plan y de tokens y ofrecer soporte.",
          "Para procesar pagos y cumplir obligaciones fiscales y contables (contrato y obligación legal): emitir facturas, gestionar reembolsos, prevenir el fraude en pagos y conservar la documentación contable.",
          "Para mantener la plataforma segura y fiable (interés legítimo): rate limiting, prevención de abusos y fraude, registros de seguridad, depuración de errores y protección de la infraestructura.",
          "Para enviar correos transaccionales y comunicaciones sobre la cuenta (contrato): mensajes de bienvenida, recibos, avisos de suscripción y consumo, alertas de seguridad. No enviamos correos de marketing sin tu consentimiento y puedes darte de baja de las comunicaciones no esenciales en cualquier momento.",
          "Para mejorar el Servicio (interés legítimo): estadísticas agregadas sobre uso y errores, para corregir problemas y priorizar funcionalidades. No usamos el contenido de tus conversaciones para entrenar modelos.",
          "Para cumplir la ley (obligación legal): responder a requerimientos legítimos de las autoridades y conservar los registros que estamos obligados a mantener.",
        ],
      },
      {
        heading: "6. Tratamiento con IA de tus conversaciones",
        paragraphs: [
          "Las respuestas de los agentes las genera un modelo de lenguaje de terceros (Anthropic Claude). El contenido de tus mensajes, el contexto relevante de la conversación y los resultados de las herramientas conectadas se transmiten al proveedor del modelo únicamente para generar la respuesta que has solicitado.",
          "Ni nosotros ni nuestro proveedor del modelo utilizamos el contenido de tus conversaciones para entrenar modelos de IA. Tus conversaciones no se venden ni se usan con fines publicitarios.",
          "No envíes a los agentes categorías especiales de datos (por ejemplo datos de salud) ni datos que no puedas compartir: los agentes son herramientas de automatización generalistas y no están diseñados para ese tipo de contenido.",
        ],
      },
      {
        heading: "7. Cesión de datos",
        paragraphs: [
          "No vendemos tus datos personales ni los compartimos con terceros para sus propias finalidades de marketing.",
          "Compartimos datos con los proveedores de servicios (encargados del tratamiento) que operan el Servicio por nuestra cuenta: Supabase (base de datos y autenticación); Stripe y PayPal (pagos, facturación y reembolsos); Resend (envío de correos transaccionales); Anthropic (inferencia del modelo de IA); Google (inicio de sesión con Google y, si los conectas, Gmail, Google Calendar y Google Sheets); el proveedor de la integración que decidas conectar (por ejemplo Shopify, Slack, Notion o HubSpot); y Vercel (hosting y analítica web agregada).",
          "Estos proveedores solo pueden acceder a los datos personales para prestar el servicio por nuestra cuenta, en virtud de un contrato, y están obligados a protegerlos. La lista actualizada de encargados está disponible si la solicitas en privacy@agentcloud.agency.",
          "También podemos comunicar datos cuando lo exija la ley, para cumplir una obligación legal o para proteger los derechos, la seguridad y la integridad de AgentCloud, de nuestros usuarios o del público.",
          "Si AgentCloud participa en una fusión, adquisición o venta de activos, los datos podrían transferirse a la entidad sucesora; te lo notificaremos y esta política seguirá aplicándose a tus datos hasta que se actualice.",
        ],
      },
      {
        heading: "8. Cookies y tecnologías similares",
        paragraphs: [
          "Utilizamos un número reducido de cookies, todas necesarias para el funcionamiento del Servicio. Las cookies de autenticación de Supabase mantienen tu sesión iniciada. Una cookie de preferencias guarda tu idioma y otra tu tema claro u oscuro, para que el sitio se abra con el idioma y el aspecto correctos. Durante los flujos de lista de espera o de autorización OAuth se establece una cookie de corta duración para protegerlos frente a falsificaciones.",
          "Parte de la información se guarda localmente en tu navegador en lugar de en una cookie, por ejemplo el contenido del carrito. Puedes borrarla vaciando el carrito o eliminando los datos del navegador.",
          "Utilizamos Vercel Analytics y Speed Insights para entender el tráfico agregado y el rendimiento. Son respetuosos con la privacidad y no usan cookies para perfilarte entre sitios; no utilizamos cookies publicitarias ni de seguimiento entre sitios. Como solo empleamos tecnologías técnicamente necesarias y medición agregada, no se requiere un banner de consentimiento; aun así puedes bloquear las cookies desde tu navegador, teniendo en cuenta que algunas partes del Servicio (por ejemplo la sesión) dejarán de funcionar.",
        ],
      },
      {
        heading: "9. Transferencias internacionales de datos",
        paragraphs: [
          "Algunos de nuestros proveedores están fuera del Espacio Económico Europeo, en particular en Estados Unidos (por ejemplo Vercel, Supabase, Anthropic y Stripe). Cuando los datos personales se transfieren fuera del EEE nos basamos en las Cláusulas Contractuales Tipo de la Comisión Europea y, cuando procede, en la certificación del proveedor conforme al Marco de Privacidad de Datos UE-EE. UU., junto con medidas técnicas como el cifrado en tránsito y en reposo.",
        ],
      },
      {
        heading: "10. Cuánto tiempo conservamos los datos",
        paragraphs: [
          "Datos de la cuenta y del perfil: mientras la cuenta esté activa y hasta 30 días después de su eliminación, para completar el borrado en las copias de seguridad.",
          "Historial de conversaciones y registros de uso: hasta 12 meses, o hasta que elimines la conversación o tu cuenta, si esto ocurre antes.",
          "Facturas, registros de facturación y fiscales: 10 años, según exige la normativa fiscal italiana, incluso después de cancelar la suscripción.",
          "Tokens de integraciones: hasta que desconectes la integración o elimines tu cuenta, y en todo caso se eliminan en el proveedor cuando revocas el acceso. Los tokens están cifrados en reposo.",
          "Solicitudes de lista de espera, contacto y demo: hasta 24 meses desde nuestro último contacto.",
          "Registros de seguridad y contadores de rate limiting: un máximo de 12 meses (los contadores suelen conservarse entre horas y días).",
        ],
      },
      {
        heading: "11. Seguridad",
        paragraphs: [
          "Protegemos tus datos con medidas técnicas y organizativas: cifrado TLS en tránsito, cifrado AES-256-GCM de los tokens OAuth de terceros en reposo, reglas de acceso a la base de datos (row level security) que limitan los datos a la cuenta propietaria, secretos cifrados gestionados solo en el servidor, acceso a los sistemas bajo el principio de mínimo privilegio y rate limiting contra abusos.",
          "Ningún método de transmisión o almacenamiento es 100 % seguro. Si tenemos conocimiento de una violación de datos personales que pueda suponer un riesgo para tus derechos, te lo notificaremos y avisaremos a la autoridad de control competente sin dilación indebida.",
        ],
      },
      {
        heading: "12. Tus derechos",
        paragraphs: [
          "Si te encuentras en el Espacio Económico Europeo (o en otra jurisdicción con normas equivalentes) tienes derecho a: acceder a tus datos personales y recibir una copia; rectificar los datos inexactos; suprimir los datos cuando no exista una obligación legal prevalente de conservarlos; limitar u oponerte al tratamiento, incluido el basado en interés legítimo; recibir en un formato estructurado y legible por máquina los datos que hayas facilitado (portabilidad); retirar el consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento anterior.",
          "Para ejercer estos derechos escribe a privacy@agentcloud.agency desde la dirección de correo de tu cuenta. Respondemos en 30 días y no cobramos por una solicitud razonable. También puedes eliminar tu cuenta directamente desde los ajustes de tu cuenta.",
          "Si consideras que tus datos se tratan de forma ilícita, puedes presentar una reclamación ante la autoridad de control competente — en Italia, el Garante per la protezione dei dati personali (www.garanteprivacy.it) — o ante la autoridad de tu residencia habitual, lugar de trabajo o lugar de la presunta infracción.",
        ],
      },
      {
        heading: "13. Decisiones automatizadas y menores",
        paragraphs: [
          "No adoptamos decisiones que produzcan efectos jurídicos o similarmente significativos sobre ti mediante tratamientos automatizados sin intervención humana, y no te perfilamos con fines publicitarios.",
          "El Servicio es una herramienta profesional y no está dirigido a menores. Para crear una cuenta debes tener al menos 16 años (o 14, la edad mínima que establece la ley italiana para el consentimiento en servicios de la sociedad de la información). No recopilamos conscientemente datos de menores por debajo de esa edad: si crees que un menor nos ha facilitado datos personales, contáctanos y los eliminaremos.",
        ],
      },
      {
        heading: "14. Cambios en esta política",
        paragraphs: [
          "Podemos actualizar esta política para reflejar cambios en el Servicio, en nuestros proveedores o en la ley. Cuando los cambios sean sustanciales actualizaremos la fecha que figura al inicio de esta página y, si la modificación es significativa, te avisaremos por correo electrónico o en la aplicación antes de que entre en vigor. Seguir usando el Servicio después de la actualización implica aceptar la política revisada.",
        ],
      },
      {
        heading: "15. Contacto",
        paragraphs: [
          "Solicitudes de privacidad, derechos de los interesados y avisos de seguridad: privacy@agentcloud.agency",
          "Soporte de cuenta y servicio: support@agentcloud.agency",
        ],
      },
    ],
  },
  terms: {
    title: "Términos de servicio",
    lastUpdated: "Última actualización: septiembre de 2026",
    sections: [
      {
        heading: "1. Aceptación de los Términos",
        paragraphs: [
          "Estos Términos de servicio rigen tu acceso y uso de AgentCloud, el sitio web y la plataforma disponibles en agentcloud.agency y sus subdominios (el Servicio), operados por AgentCloud (nosotros). Al crear una cuenta, suscribirte a un agente o usar el Servicio aceptas estos términos.",
          "Estos términos se completan con nuestra Política de privacidad (cómo tratamos los datos personales) y nuestra Política de reembolsos (facturación y devoluciones): si no las aceptas, no utilices el Servicio.",
          "Si aceptas en nombre de una empresa u otra organización, confirmas que estás autorizado a vincularla y que esa organización es responsable de cumplir estos términos.",
        ],
      },
      {
        heading: "2. Descripción del Servicio",
        paragraphs: [
          "AgentCloud es una plataforma sin código que te permite activar y gestionar agentes de IA. Eliges agentes en el marketplace, conectas las herramientas que ya usas (por ejemplo Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion o HubSpot) e interactúas con los agentes desde nuestra interfaz web. Cada agente se describe en su página de producto, con las funciones que utiliza y su precio.",
          "El Servicio es una herramienta de automatización empresarial y evoluciona con el tiempo: podemos añadir, modificar o retirar agentes o funcionalidades concretas, sin reducir de forma sustancial, durante un periodo ya pagado, la funcionalidad que has adquirido.",
          "AgentCloud no es un despacho jurídico, contable, médico o financiero, y el Servicio no presta asesoramiento profesional.",
        ],
      },
      {
        heading: "3. Registro de la cuenta y seguridad",
        paragraphs: [
          "Necesitas una dirección de correo electrónico válida para crear una cuenta. La autenticación la gestiona Supabase Auth: puedes registrarte con correo y contraseña o con tu cuenta de Google.",
          "Debes tener al menos 16 años (o 14, la edad mínima que establece la ley italiana para el consentimiento en servicios de la sociedad de la información) y facilitar información correcta. Una cuenta por persona o empresa: eres responsable de todo lo que ocurra a través de tu cuenta y debes mantener tus credenciales confidenciales.",
          "Avísanos de inmediato en support@agentcloud.agency si sospechas de un acceso no autorizado a tu cuenta o de cualquier incidente de seguridad relacionado con el Servicio.",
        ],
      },
      {
        heading: "4. Suscripciones, facturación e impuestos",
        paragraphs: [
          "Cada agente se vende como una suscripción mensual independiente, al precio indicado en la página del agente. Todos los precios están en EUR y no incluyen impuestos; el IVA se aplica cuando la ley lo exige. Los pagos los procesan nuestros proveedores Stripe y PayPal y pueden realizarse con tarjeta, Klarna, Amazon Pay u otros métodos que admitan. El precio se factura por adelantado cada mes y la suscripción se renueva automáticamente hasta que se cancele.",
          "Puedes cancelar en cualquier momento desde el panel o el portal de facturación: la cancelación surte efecto al final del periodo en curso, mantienes el acceso al agente hasta esa fecha y no se te vuelve a cobrar.",
          "Cada plan incluye una asignación mensual de tokens. El consumo por encima de la asignación se factura por uso a 0,30 € por cada 1.000 tokens adicionales, hasta un límite de seguridad equivalente al doble de la asignación del plan, a partir del cual se suspenden las ejecuciones.",
          "Si un pago es rechazado o falla, podemos reintentar el cargo en el método de pago registrado. En caso de impago podemos suspender el acceso y, con aviso previo, cancelar la suscripción.",
          "Podemos cambiar precios y condiciones de los planes: los cambios se comunican con antelación y se aplican desde la siguiente renovación. Los precios, las facturas y los registros fiscales se conservan como se describe en la Política de privacidad.",
        ],
      },
      {
        heading: "5. Resultados de los agentes de IA",
        paragraphs: [
          "Los agentes generan sus respuestas con un modelo de lenguaje de terceros (Anthropic Claude). El resultado de la IA puede ser inexacto, incompleto o estar desactualizado: eres responsable de revisarlo antes de confiar en él y no puede considerarse asesoramiento jurídico, fiscal, médico o financiero.",
          "Eres responsable de los mensajes y datos que envías a los agentes y de las decisiones que tomas a partir de sus resultados. No envíes categorías especiales de datos personales (por ejemplo datos de salud) ni datos que no puedas compartir: cómo se tratan las conversaciones — y el hecho de que no se usan para entrenar modelos — se describe en la Política de privacidad (secciones 6 y 13).",
          "Las instrucciones que das a un agente se ejecutan con las credenciales que hayas conectado: mantén supervisión humana sobre las acciones con efectos externos (correos, pedidos, facturas, publicaciones).",
        ],
      },
      {
        heading: "6. Integraciones y servicios de terceros",
        paragraphs: [
          "Usar un agente puede requerir conectar servicios de terceros. Al conectar una integración nos autorizas a actuar sobre esa cuenta dentro de los permisos que apruebes: los tokens OAuth se cifran en reposo y se usan solo para ejecutar las acciones que inicias.",
          "Confirmas que tienes derecho a conectar esas cuentas y aceptas las condiciones del proveedor correspondiente (por ejemplo Shopify, Google, Slack, Notion, HubSpot, Meta/WhatsApp). Los servicios de terceros no dependen de nosotros: su disponibilidad, precios y condiciones pueden cambiar, y su descontinuación puede limitar el Servicio.",
          "Puedes desconectar una integración en cualquier momento desde el panel, lo que impide que el agente acceda a ella.",
        ],
      },
      {
        heading: "7. Uso aceptable",
        paragraphs: [
          "Aceptas no: usar el Servicio con fines ilegales o que vulneren derechos de terceros; intentar eludir la autenticación, los controles de acceso, los límites de plan o de tokens; aplicar ingeniería inversa, descompilar o extraer el código fuente de los agentes; usar el Servicio para generar spam, acoso, malware, contenido engañoso o comunicaciones ilícitas; enviar mensajes que suplanten de forma engañosa a una persona u organización; revender o sublicenciar el Servicio sin nuestro consentimiento por escrito; sobrecargar la infraestructura, incluso mediante solicitudes automatizadas desproporcionadas.",
          "Podemos suspender las cuentas que incumplan estas reglas, como se describe en la sección sobre suspensión y cancelación.",
        ],
      },
      {
        heading: "8. Propiedad intelectual",
        paragraphs: [
          "La plataforma, los agentes, la marca y los contenidos que ofrecemos pertenecen a AgentCloud o a sus licenciantes y están protegidos por la ley: te concedemos un derecho de uso limitado, no exclusivo e intransferible durante la vigencia de tu suscripción.",
          "Los datos y contenidos que subes o generas con los agentes (datos de tus clientes, presupuestos, documentos) siguen siendo tuyos. Nos concedes una licencia para tratarlos solo en la medida necesaria para prestar el Servicio, como se describe en la Política de privacidad.",
          "Los comentarios y sugerencias que nos envíes no son confidenciales y podemos usarlos para mejorar el Servicio.",
        ],
      },
      {
        heading: "9. Disponibilidad y soporte",
        paragraphs: [
          "Trabajamos para mantener la plataforma disponible y segura, pero no garantizamos un servicio ininterrumpido: el mantenimiento, las actualizaciones o los problemas de nuestros proveedores pueden provocar interrupciones temporales. Salvo acuerdo por escrito para planes enterprise no ofrecemos un nivel de servicio garantizado: los remedios por una indisponibilidad prolongada son los previstos en la Política de reembolsos.",
          "Soporte: support@agentcloud.agency, por lo general en un plazo de 24 horas en días laborables.",
        ],
      },
      {
        heading: "10. Reembolsos y derecho de desistimiento",
        paragraphs: [
          "AgentCloud presta servicios digitales: conforme al Derecho de consumo de la UE dispones de 14 días de derecho de desistimiento desde la compra, que decae en cuanto el servicio comienza con tu consentimiento. Al suscribirte consientes el inicio inmediato del servicio: por tanto, las suscripciones activadas no son reembolsables, salvo en los casos indicados en la Política de reembolsos, que forma parte integrante de estos términos.",
          "En resumen: los cargos incorrectos o duplicados se reembolsan íntegramente; una indisponibilidad prolongada atribuible a AgentCloud se reembolsa de forma proporcional al periodo no disfrutado; las asignaciones de tokens no consumidas no se acumulan y el consumo por exceso ya facturado no es reembolsable.",
          "Cómo solicitarlo y plazos de tramitación: consulta la Política de reembolsos (escribe a legal@agentcloud.agency).",
        ],
      },
      {
        heading: "11. Suspensión y cancelación",
        paragraphs: [
          "Puedes detenerte cuando quieras: cancela la suscripción desde el panel o el portal de facturación y, si lo deseas, elimina tu cuenta desde los ajustes de tu cuenta. La cancelación detiene las renovaciones futuras; eliminar la cuenta borra tus datos como se describe en la Política de privacidad (sección 10), salvo los registros que debamos conservar por ley.",
          "Podemos suspender o cancelar el Servicio, con aviso cuando sea posible, si: incumples estos términos (en particular el uso aceptable); un pago falla y no se regulariza; la ley nos obliga; o seguir prestando el Servicio crearía un riesgo legal o de seguridad. En caso de incumplimientos graves podemos suspender el acceso de inmediato.",
          "Al cancelarse, tu derecho de uso termina, los agentes dejan de funcionar y el importe ya pagado por el periodo en curso sigue siendo debido; las cláusulas que por su naturaleza sobreviven (responsabilidad, propiedad intelectual, ley aplicable) siguen aplicándose.",
        ],
      },
      {
        heading: "12. Datos personales y privacidad",
        paragraphs: [
          "AgentCloud es el responsable del tratamiento de los datos personales tratados a través del Servicio. Qué datos recopilamos, por qué, durante cuánto tiempo los conservamos, con quién los compartimos y cuáles son tus derechos (acceso, rectificación, supresión, limitación, oposición, portabilidad, retirada del consentimiento) se describe en la Política de privacidad, que forma parte integrante de estos términos.",
          "Si con los agentes tratas datos personales de tus clientes, el responsable de esos datos eres tú y nosotros actuamos como encargado: escribe a privacy@agentcloud.agency para recibir nuestro acuerdo de tratamiento de datos (DPA).",
          "Para solicitudes y reclamaciones en materia de privacidad también puedes dirigirte a la autoridad de control italiana, el Garante per la protezione dei dati personali.",
        ],
      },
      {
        heading: "13. Limitación de responsabilidad",
        paragraphs: [
          "El Servicio se presta tal cual, sin garantías de ningún tipo en la medida permitida por la ley. No somos responsables de daños indirectos o consecuenciales, pérdida de beneficios, pérdida de datos o interrupción del negocio derivados del uso de agentes de IA, incluidos los errores en los resultados automatizados.",
          "En la medida permitida por la ley, nuestra responsabilidad total por reclamaciones relacionadas con el Servicio se limita a las cuotas que hayas pagado en los 12 meses anteriores al hecho que origine la reclamación. Nada en estos términos excluye o limita los derechos que la normativa de consumo te reconoce como consumidor, ni nuestra responsabilidad por dolo o negligencia grave.",
        ],
      },
      {
        heading: "14. Cambios en los Términos",
        paragraphs: [
          "Podemos actualizar estos términos para reflejar cambios en el Servicio, en nuestros proveedores o en la ley. Publicamos la fecha de la última actualización al inicio de esta página y, para cambios sustanciales, te avisamos por correo electrónico o en la aplicación antes de que entren en vigor. Seguir usando el Servicio después de la actualización implica aceptar los términos revisados.",
        ],
      },
      {
        heading: "15. Ley aplicable y resolución de conflictos",
        paragraphs: [
          "Estos términos se rigen por el Derecho italiano, sin perjuicio de las protecciones imperativas de los consumidores de tu país de residencia. Si eres consumidor puedes ejercitar acciones ante el tribunal de tu lugar de residencia, trabajo o domicilio; en los demás casos son competentes los tribunales de Italia.",
          "Si eres consumidor en la UE también puedes dirigirte a la red de Centros Europeos del Consumidor para informarte sobre la resolución extrajudicial de conflictos.",
        ],
      },
      {
        heading: "16. Contacto",
        paragraphs: [
          "Contratos, facturación y reembolsos: legal@agentcloud.agency",
          "Soporte y cuenta: support@agentcloud.agency",
          "Datos personales y RGPD: privacy@agentcloud.agency",
        ],
      },
    ],
  },
  refunds: {
    title: "Política de reembolsos",
    lastUpdated: "Última actualización: septiembre de 2026",
    sections: [
      {
        heading: "1. Servicios digitales y derecho de desistimiento",
        paragraphs: [
          "AgentCloud presta servicios digitales de entrega inmediata. Conforme al Derecho de consumo de la UE dispones de un derecho de desistimiento de 14 días desde la compra, que decae en cuanto el servicio comienza con tu consentimiento expreso.",
          "Al suscribirte solicitas el inicio inmediato del servicio y reconoces que, por tanto, las suscripciones activadas no son reembolsables, salvo en los casos descritos en esta política, que forma parte integrante de los Términos de servicio.",
        ],
      },
      {
        heading: "2. Casos en los que procede el reembolso",
        paragraphs: [
          "Reembolsamos en los siguientes casos:",
          "Cargos incorrectos o duplicados: el importe reclamado se reembolsa íntegramente, incluidos los impuestos aplicados.",
          "Indisponibilidad prolongada atribuible a AgentCloud: si el agente suscrito no puede utilizarse por causas que dependen de nosotros, el reembolso es proporcional al periodo no disfrutado (por ejemplo 15 días de indisponibilidad en una suscripción mensual corresponden al 50 % del precio).",
          "Defecto no resuelto: si un agente de pago no realiza la función descrita en su página de producto y no podemos corregirlo en un plazo de 15 días desde tu aviso, reembolsamos la parte no disfrutada del periodo.",
        ],
      },
      {
        heading: "3. Casos en los que no procede el reembolso",
        paragraphs: [
          "Las asignaciones de tokens no consumidas no se acumulan para el mes siguiente ni se reembolsan.",
          "El consumo por exceso ya facturado no es reembolsable: corresponde a procesamiento que has utilizado realmente, a 0,30 € por cada 1.000 tokens adicionales dentro del límite de seguridad del plan.",
          "Las suscripciones activadas y utilizadas no son reembolsables fuera de los casos anteriores, ni aunque simplemente dejes de usar el agente u olvides cancelar antes de la renovación.",
          "Las cuentas suspendidas por incumplimiento de los Términos de servicio (por ejemplo uso ilícito o abuso de la infraestructura) no dan derecho a reembolso.",
          "No reembolsamos importes por problemas causados por servicios de terceros que hayas conectado ni por tus propios sistemas o credenciales.",
        ],
      },
      {
        heading: "4. Cómo solicitar un reembolso",
        paragraphs: [
          "Escribe a legal@agentcloud.agency desde la dirección de correo de tu cuenta indicando: correo de la cuenta, agente o suscripción afectada, fecha e importe del cargo y motivo de la solicitud (con pruebas si las tienes, por ejemplo mensajes de error o capturas de pantalla).",
          "Revisamos las solicitudes en un plazo de 5 días laborables desde su recepción y respondemos con el resultado; si necesitamos más información, el plazo se reinicia desde tu respuesta. Las solicitudes enviadas más de 60 días después del cargo pueden rechazarse, sin perjuicio de los derechos legales imperativos.",
        ],
      },
      {
        heading: "5. Plazos y modalidades del reembolso",
        paragraphs: [
          "Los reembolsos aprobados se emiten a través del método de pago original (Stripe o PayPal), normalmente en 5-10 días laborables según la red de la tarjeta, PayPal y tu banco; el plazo de abono depende de tu proveedor.",
          "Los reembolsos se emiten en la misma divisa del cargo (EUR). No podemos reembolsar en una tarjeta o cuenta distintas de las utilizadas para el pago.",
        ],
      },
      {
        heading: "6. Contracargos y disputas de pago",
        paragraphs: [
          "Si crees que un cargo es incorrecto, escríbenos a legal@agentcloud.agency antes de abrir una disputa con tu banco, la red de la tarjeta o PayPal: casi siempre podemos resolverlo más rápido.",
          "Si abres un contracargo, podemos suspender la suscripción y el acceso al agente mientras se resuelve la disputa, y facilitar al proveedor de pagos los registros de cargos y consumo. Si la disputa se resuelve a tu favor, el reembolso sigue el proceso del proveedor de pagos.",
        ],
      },
      {
        heading: "7. Ley aplicable y derechos imperativos",
        paragraphs: [
          "Esta política se rige por el Derecho italiano. Ninguna de sus cláusulas limita ni sustituye las protecciones imperativas que la normativa de consumo te reconoce; en caso de conflicto prevalece la norma más favorable al consumidor.",
          "Como consumidor puedes dirigirte a tu autoridad nacional de consumo, a la red de Centros Europeos del Consumidor o, en materia de datos personales, al Garante per la protezione dei dati personali. Los tribunales competentes son los indicados en los Términos de servicio.",
          "Las relaciones de facturación entre empresas (B2B) se rigen por los Términos de servicio y, en su caso, por el pedido firmado.",
        ],
      },
      {
        heading: "8. Contacto",
        paragraphs: [
          "Reembolsos y facturación: legal@agentcloud.agency",
          "Soporte de cuenta: support@agentcloud.agency",
        ],
      },
    ],
  },
};

const DE: Record<LegalDocumentKey, LegalTranslation> = {
  privacy: {
    title: "Datenschutzerklärung",
    lastUpdated: "Letzte Aktualisierung: September 2026",
    sections: [
      {
        heading: "1. Wer wir sind und Verantwortlicher",
        paragraphs: [
          "AgentCloud (AgentCloud, wir, uns) betreibt die Website und die Plattform unter agentcloud.agency und deren Subdomains (der Dienst). AgentCloud ist Verantwortlicher für die in dieser Erklärung beschriebenen personenbezogenen Daten.",
          "In allen Datenschutzfragen, auch zur Ausübung deiner Rechte, erreichst du uns unter privacy@agentcloud.agency; für Support zu Konto und Produkt lautet die Adresse support@agentcloud.agency. Wir beantworten Datenschutzanfragen innerhalb von 30 Tagen.",
          "Diese Erklärung gilt für unsere Website, die AgentCloud-Plattform und die KI-Agenten, die du abonnierst. Sie gilt nicht für Websites und Dienste Dritter, die du mit AgentCloud verbindest; für diese gelten deren eigene Datenschutzerklärungen.",
        ],
      },
      {
        heading: "2. Was AgentCloud macht",
        paragraphs: [
          "AgentCloud ist eine No-Code-Plattform, mit der Unternehmen KI-Agenten aktivieren und verwalten. Du erstellst ein Konto, wählst Agenten im Marketplace, verbindest die Tools, die du bereits verwendest (zum Beispiel Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion oder HubSpot), und kommunizierst über unsere Weboberfläche mit den Agenten.",
          "Um diesen Dienst zu erbringen, verarbeiten wir Kontodaten, Abrechnungsdaten, die Nachrichten, die du mit Agenten austauschst, die Daten, die verbundene Tools an die Agenten senden, sowie die technischen Daten, die für Sicherheit und Nutzungsmessung erforderlich sind.",
        ],
      },
      {
        heading: "3. Welche Informationen wir erheben",
        paragraphs: [
          "Konto- und Profildaten: Name, E-Mail-Adresse, Profilbild (bei Anmeldung mit Google), Authentifizierungsmethode, Sprache und Oberflächeneinstellungen, Erstellungsdatum und Status des Kontos.",
          "Authentifizierungsdaten: Anmeldung und Registrierung werden von Supabase Auth verwaltet. Registrierst du dich mit E-Mail und Passwort, speichert unser Authentifizierungsanbieter das Passwort ausschließlich als gesalzenen Hash - wir sehen es nie und speichern es nie im Klartext. Bei Anmeldung mit Google erhalten wir Name, E-Mail-Adresse und Profilbild von Google.",
          "Abrechnungsdaten: abonnierter Plan und Agenten, Beträge, Währung, Rechnungen, Zahlungsstatus, Rechnungsland und Art der verwendeten Zahlungsmethode (zum Beispiel Karte, Klarna oder Amazon Pay). Kartennummern und vollständige Zahlungsdaten werden direkt von unseren Zahlungsdienstleistern (Stripe und PayPal) erhoben und gespeichert; sie laufen nie über AgentCloud-Server, die nur ein Token, das Kartenschema und die letzten Ziffern erhalten.",
          "Gesprächs- und Nutzungsdaten: die Nachrichten, die du an Agenten sendest, die erzeugten Antworten, die Tools oder Integrationen, die der Agent in deinem Namen nutzt, die Anzahl der verbrauchten Token und Zeitstempel. Diese Daten sind erforderlich, um Antworten zu liefern, Planlimits durchzusetzen und Mehrverbrauch abzurechnen.",
          "Daten verbundener Integrationen: wenn du ein Tool Dritter verbindest, speichern wir die von dir autorisierten OAuth-Zugriffs- und Refresh-Tokens (verschlüsselt im Ruhezustand) und die wenigen Metadaten, die zur Identifizierung der Verbindung nötig sind (zum Beispiel die Shop-Domain bei Shopify). Agentenaktionen laufen mit diesen Tokens nur, wenn du sie auslöst.",
          "Formular- und Kommunikationsdaten: Name, Nachname, E-Mail-Adresse und Inhalt deiner Nachricht, wenn du das Kontaktformular nutzt, eine Demo anforderst oder der Warteliste beitrittst.",
          "Technische Daten und Sicherheitsdaten: IP-Adresse, User Agent und Anfrage-Metadaten, die für Rate Limiting, Missbrauchsprävention, Fehlerdiagnose und Sicherheitsprotokolle verwendet werden.",
        ],
      },
      {
        heading: "4. Wie wir Informationen erheben",
        paragraphs: [
          "Direkt von dir, wenn du ein Konto erstellst, abonnierst, mit einem Agenten kommunizierst, eine Integration verbindest oder eines unserer Formulare ausfüllst.",
          "Von dem von dir gewählten Identitätsanbieter, etwa Google, oder von den Diensten Dritter, die du verbindest und die uns die Daten senden, die der Agent für die von dir angeforderte Aufgabe benötigt.",
          "Automatisch von deinem Browser oder Gerät über die in Abschnitt 8 beschriebenen Cookies und ähnlichen Technologien.",
        ],
      },
      {
        heading: "5. Wofür wir deine Daten nutzen und auf welcher Rechtsgrundlage",
        paragraphs: [
          "Zur Erbringung des von dir angeforderten Dienstes (Vertragserfüllung): Konto erstellen und verwalten, abonnierte Agenten ausführen, Gesprächsverlauf speichern, Plan- und Tokenlimits durchsetzen und Support leisten.",
          "Zur Zahlungsabwicklung und zur Erfüllung steuerlicher und buchhalterischer Pflichten (Vertrag und rechtliche Verpflichtung): Rechnungen stellen, Rückerstattungen bearbeiten, Zahlungsbetrug verhindern und Buchhaltungsunterlagen aufbewahren.",
          "Für Sicherheit und Zuverlässigkeit der Plattform (berechtigtes Interesse): Rate Limiting, Missbrauchs- und Betrugsprävention, Sicherheitsprotokollierung, Fehlerbehebung und Schutz unserer Infrastruktur.",
          "Für transaktionale und kontobezogene E-Mails (Vertrag): Willkommensnachrichten, Belege, Abonnement- und Nutzungshinweise, Sicherheitswarnungen. Marketing-E-Mails senden wir nur mit deiner Einwilligung; von nicht wesentlichen Mitteilungen kannst du dich jederzeit abmelden.",
          "Zur Verbesserung des Dienstes (berechtigtes Interesse): aggregierte Statistiken zu Nutzung und Fehlern, um Probleme zu beheben und Funktionen zu priorisieren. Wir nutzen deine Gesprächsinhalte nicht zum Trainieren von Modellen.",
          "Zur Einhaltung von Rechtspflichten (rechtliche Verpflichtung): Beantwortung rechtmäßiger Anfragen von Behörden und Aufbewahrung der vorgeschriebenen Unterlagen.",
        ],
      },
      {
        heading: "6. KI-Verarbeitung deiner Gespräche",
        paragraphs: [
          "Agentenantworten werden von einem Sprachmodell Dritter erzeugt (Anthropic Claude). Der Inhalt deiner Nachrichten, der relevante Gesprächskontext und die Ergebnisse verbundener Tools werden ausschließlich zur Erzeugung der angeforderten Antwort an den Modellanbieter übermittelt.",
          "Weder wir noch unser Modellanbieter verwenden deine Gesprächsinhalte zum Trainieren von KI-Modellen. Deine Gespräche werden nicht verkauft und nicht für Werbung genutzt.",
          "Sende Agenten keine besonderen Kategorien personenbezogener Daten (zum Beispiel Gesundheitsdaten) und keine Daten, die du nicht teilen darfst: Agenten sind universelle Automatisierungswerkzeuge und nicht für solche Inhalte ausgelegt.",
        ],
      },
      {
        heading: "7. Weitergabe von Daten",
        paragraphs: [
          "Wir verkaufen deine personenbezogenen Daten nicht und geben sie nicht für Marketingzwecke Dritter weiter.",
          "Wir geben Daten an die Dienstleister (Auftragsverarbeiter) weiter, die den Dienst für uns betreiben: Supabase (Datenbank und Authentifizierung); Stripe und PayPal (Zahlungen, Abrechnung und Rückerstattungen); Resend (Versand transaktionaler E-Mails); Anthropic (KI-Modellinferenz); Google (Anmeldung mit Google und, sofern verbunden, Gmail, Google Calendar und Google Sheets); den Integrationsanbieter, den du verbindest (zum Beispiel Shopify, Slack, Notion oder HubSpot); und Vercel (Hosting und aggregierte Webanalyse).",
          "Diese Anbieter dürfen personenbezogene Daten nur zur Erbringung des Dienstes für uns und auf vertraglicher Grundlage verarbeiten und müssen sie schützen. Eine aktuelle Liste unserer Auftragsverarbeiter erhältst du auf Anfrage unter privacy@agentcloud.agency.",
          "Wir können Daten außerdem offenlegen, wenn dies gesetzlich vorgeschrieben ist, um eine rechtliche Verpflichtung zu erfüllen oder um Rechte, Sicherheit und Schutz von AgentCloud, unseren Nutzern oder der Öffentlichkeit zu wahren.",
          "Ist AgentCloud an einer Fusion, Übernahme oder einem Vermögensverkauf beteiligt, können Daten auf die Nachfolgegesellschaft übertragen werden; wir informieren dich und diese Erklärung gilt weiter für deine Daten, bis sie aktualisiert wird.",
        ],
      },
      {
        heading: "8. Cookies und ähnliche Technologien",
        paragraphs: [
          "Wir verwenden wenige Cookies, alle sind für den Betrieb des Dienstes erforderlich. Supabase-Authentifizierungs-Cookies halten dich angemeldet. Ein Präferenz-Cookie speichert deine Sprache und ein weiteres dein helles oder dunkles Design, damit die Seite in der richtigen Sprache und Darstellung lädt. Während Wartelisten- oder OAuth-Autorisierungsvorgängen wird ein kurzlebiges Cookie gesetzt, um Fälschungen zu verhindern.",
          "Einige Informationen werden lokal im Browser statt in einem Cookie gespeichert, zum Beispiel der Inhalt deines Warenkorbs. Du kannst sie löschen, indem du den Warenkorb leerst oder die Browserdaten entfernst.",
          "Wir nutzen Vercel Analytics und Speed Insights, um aggregierten Traffic und Leistung zu verstehen. Sie sind datenschutzfreundlich und verwenden keine Cookies, um dich seitenübergreifend zu profilieren; Werbe- oder Cross-Site-Tracking-Cookies setzen wir nicht ein. Da wir nur technisch notwendige Technologien und aggregierte Messungen verwenden, ist kein Consent-Banner erforderlich; du kannst Cookies dennoch in den Browsereinstellungen blockieren - Teile des Dienstes (etwa die Anmeldung) funktionieren dann nicht mehr.",
        ],
      },
      {
        heading: "9. Internationale Datenübermittlungen",
        paragraphs: [
          "Einige unserer Anbieter sitzen außerhalb des Europäischen Wirtschaftsraums, insbesondere in den USA (zum Beispiel Vercel, Supabase, Anthropic und Stripe). Bei Übermittlungen außerhalb des EWR stützen wir uns auf die Standardvertragsklauseln der Europäischen Kommission und, soweit anwendbar, auf die Zertifizierung des Anbieters nach dem EU-US Data Privacy Framework, zusammen mit technischen Maßnahmen wie Verschlüsselung bei Übertragung und Speicherung.",
        ],
      },
      {
        heading: "10. Wie lange wir Daten speichern",
        paragraphs: [
          "Konto- und Profildaten: solange dein Konto aktiv ist und bis zu 30 Tage nach seiner Löschung, damit die Löschung auch in Backups abgeschlossen werden kann.",
          "Gesprächsverlauf und Nutzungsdaten: bis zu 12 Monate oder bis du das Gespräch oder dein Konto löschst, je nachdem, was früher eintritt.",
          "Rechnungs-, Abrechnungs- und Steuerunterlagen: 10 Jahre, wie es das italienische Steuerrecht verlangt, auch nach Kündigung des Abonnements.",
          "Integrationstokens: bis du die Integration trennst oder dein Konto löschst; beim Anbieter werden sie jedenfalls entfernt, wenn du den Zugriff widerrufst. Tokens sind im Ruhezustand verschlüsselt.",
          "Wartelisten-, Kontakt- und Demo-Anfragen: bis zu 24 Monate nach unserem letzten Kontakt.",
          "Sicherheitsprotokolle und Rate-Limit-Zähler: höchstens 12 Monate (Zähler werden in der Regel Stunden bis Tage aufbewahrt).",
        ],
      },
      {
        heading: "11. Sicherheit",
        paragraphs: [
          "Wir schützen deine Daten mit technischen und organisatorischen Maßnahmen: TLS-Verschlüsselung bei der Übertragung, AES-256-GCM-Verschlüsselung von OAuth-Tokens Dritter im Ruhezustand, Datenbankzugriffsregeln (Row Level Security), die Daten auf das jeweilige Konto beschränken, ausschließlich serverseitig verwaltete verschlüsselte Secrets, Zugriff nach dem Least-Privilege-Prinzip und Rate Limiting gegen Missbrauch.",
          "Keine Übertragungs- oder Speichermethode ist zu 100 % sicher. Erfahren wir von einer Verletzung personenbezogener Daten, die voraussichtlich ein Risiko für deine Rechte birgt, informieren wir dich und die zuständige Aufsichtsbehörde unverzüglich.",
        ],
      },
      {
        heading: "12. Deine Rechte",
        paragraphs: [
          "Im Europäischen Wirtschaftsraum (oder in einer anderen Rechtsordnung mit gleichwertigen Regeln) hast du das Recht auf: Auskunft über deine personenbezogenen Daten und Erhalt einer Kopie; Berichtigung unrichtiger Daten; Löschung, wenn keine überwiegende gesetzliche Aufbewahrungspflicht besteht; Einschränkung der Verarbeitung oder Widerspruch, auch gegen Verarbeitungen auf Grundlage berechtigter Interessen; Erhalt der von dir bereitgestellten Daten in einem strukturierten, maschinenlesbaren Format (Datenübertragbarkeit); Widerruf der Einwilligung jederzeit, ohne dass die Rechtmäßigkeit der bisherigen Verarbeitung berührt wird.",
          "Zur Ausübung dieser Rechte schreibe an privacy@agentcloud.agency von der E-Mail-Adresse deines Kontos. Wir antworten innerhalb von 30 Tagen und stellen für ein angemessenes Ersuchen keine Kosten in Rechnung. Du kannst dein Konto auch direkt in den Kontoeinstellungen löschen.",
          "Wenn du der Ansicht bist, dass deine Daten rechtswidrig verarbeitet werden, kannst du dich bei der zuständigen Aufsichtsbehörde beschweren - in Italien beim Garante per la protezione dei dati personali (www.garanteprivacy.it) - oder bei der Behörde deines gewöhnlichen Aufenthaltsorts, deines Arbeitsplatzes oder des Orts des behaupteten Verstoßes.",
        ],
      },
      {
        heading: "13. Automatisierte Entscheidungen und Minderjährige",
        paragraphs: [
          "Wir treffen keine Entscheidungen, die rechtliche oder ähnlich beeinträchtigende Wirkung auf dich haben, durch automatisierte Verarbeitung ohne menschliche Beteiligung, und wir profilieren dich nicht zu Werbezwecken.",
          "Der Dienst ist ein Geschäftswerkzeug und nicht für Minderjährige bestimmt. Für ein Konto musst du mindestens 16 Jahre alt sein (oder 14, das nach italienischem Recht geltende Mindestalter für die Einwilligung in Dienste der Informationsgesellschaft). Wir erheben wissentlich keine Daten von Kindern unter diesem Alter; wenn du glaubst, dass ein Kind uns personenbezogene Daten übermittelt hat, kontaktiere uns und wir löschen sie.",
        ],
      },
      {
        heading: "14. Änderungen dieser Datenschutzerklärung",
        paragraphs: [
          "Wir können diese Erklärung aktualisieren, um Änderungen des Dienstes, unserer Anbieter oder der Rechtslage abzubilden. Bei wesentlichen Änderungen aktualisieren wir das Datum oben auf dieser Seite und benachrichtigen dich bei bedeutenden Änderungen per E-Mail oder in der App, bevor sie wirksam werden. Die weitere Nutzung des Dienstes nach der Aktualisierung gilt als Zustimmung zur überarbeiteten Erklärung.",
        ],
      },
      {
        heading: "15. Kontakt",
        paragraphs: [
          "Datenschutzanfragen, Betroffenenrechte und Sicherheitsmeldungen: privacy@agentcloud.agency",
          "Support zu Konto und Dienst: support@agentcloud.agency",
        ],
      },
    ],
  },
  terms: {
    title: "Nutzungsbedingungen",
    lastUpdated: "Letzte Aktualisierung: September 2026",
    sections: [
      {
        heading: "1. Annahme der Bedingungen",
        paragraphs: [
          "Diese Nutzungsbedingungen regeln deinen Zugang zu und die Nutzung von AgentCloud, der Website und Plattform unter agentcloud.agency und deren Subdomains (der Dienst), betrieben von AgentCloud (wir, uns). Mit der Erstellung eines Kontos, dem Abschluss eines Agenten-Abos oder der Nutzung des Dienstes akzeptierst du diese Bedingungen.",
          "Ergänzt werden diese Bedingungen durch unsere Datenschutzerklärung (Verarbeitung personenbezogener Daten) und unsere Rückerstattungsrichtlinie (Abrechnung und Erstattungen): Wenn du sie nicht akzeptierst, nutze den Dienst nicht.",
          "Akzeptierst du im Namen eines Unternehmens oder einer anderen Organisation, bestätigst du, dass du sie binden darfst, und diese Organisation ist für die Einhaltung dieser Bedingungen verantwortlich.",
        ],
      },
      {
        heading: "2. Beschreibung des Dienstes",
        paragraphs: [
          "AgentCloud ist eine No-Code-Plattform, mit der du KI-Agenten aktivieren und verwalten kannst. Du wählst Agenten im Marketplace, verbindest die Tools, die du bereits nutzt (zum Beispiel Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion oder HubSpot), und interagierst über unsere Weboberfläche mit ihnen. Jeder Agent ist auf seiner Produktseite mit Funktionen und Preis beschrieben.",
          "Der Dienst ist ein Werkzeug zur Geschäftsautomatisierung und entwickelt sich weiter: Wir können einzelne Agenten oder Funktionen hinzufügen, ändern oder einstellen, ohne die von dir erworbene Funktionalität während eines bereits bezahlten Zeitraums wesentlich zu verringern.",
          "AgentCloud ist keine Rechtsanwalts-, Steuerberatungs-, Arzt- oder Finanzberatungspraxis, und der Dienst erbringt keine professionelle Beratung.",
        ],
      },
      {
        heading: "3. Registrierung und Kontosicherheit",
        paragraphs: [
          "Für ein Konto benötigst du eine gültige E-Mail-Adresse. Die Authentifizierung erfolgt über Supabase Auth: Du kannst dich mit E-Mail und Passwort oder mit deinem Google-Konto registrieren.",
          "Du musst mindestens 16 Jahre alt sein (oder 14, das nach italienischem Recht geltende Mindestalter für die Einwilligung in Dienste der Informationsgesellschaft) und korrekte Angaben machen. Ein Konto pro Person oder Unternehmen: Du bist für alles verantwortlich, was über dein Konto geschieht, und musst deine Zugangsdaten vertraulich behandeln.",
          "Melde uns unverzüglich unter support@agentcloud.agency, wenn du einen unbefugten Zugriff auf dein Konto oder einen Sicherheitsvorfall im Zusammenhang mit dem Dienst vermutest.",
        ],
      },
      {
        heading: "4. Abonnements, Abrechnung und Steuern",
        paragraphs: [
          "Jeder Agent wird als separates Monatsabonnement zum auf der Agentenseite angegebenen Preis verkauft. Alle Preise sind in EUR und exklusive Steuern; Umsatzsteuer wird erhoben, wo dies gesetzlich vorgeschrieben ist. Zahlungen werden von unseren Anbietern Stripe und PayPal abgewickelt und können per Karte, Klarna, Amazon Pay oder andere von ihnen unterstützte Methoden erfolgen. Die Gebühr wird monatlich im Voraus abgerechnet und das Abonnement verlängert sich automatisch, bis es gekündigt wird.",
          "Du kannst jederzeit über das Dashboard oder das Abrechnungsportal kündigen: Die Kündigung wird zum Ende des laufenden Zeitraums wirksam, du behältst bis dahin Zugang zum Agenten und es wird nichts mehr abgebucht.",
          "Jeder Plan enthält ein monatliches Token-Kontingent. Der Verbrauch über das Kontingent hinaus wird nutzungsabhängig mit 0,30 € pro 1.000 zusätzliche Token abgerechnet, bis zu einer Sicherheitsgrenze vom Zweifachen des Plan-Kontingents, ab der Ausführungen ausgesetzt werden.",
          "Wird eine Zahlung abgelehnt oder schlägt sie fehl, können wir die Belastung auf der hinterlegten Zahlungsmethode erneut versuchen. Bei Zahlungsverzug können wir den Zugang aussetzen und das Abonnement mit vorheriger Mitteilung beenden.",
          "Wir können Preise und Planbedingungen ändern: Änderungen werden im Voraus mitgeteilt und gelten ab der nächsten Verlängerung. Preise, Rechnungen und Steuerunterlagen werden wie in der Datenschutzerklärung beschrieben aufbewahrt.",
        ],
      },
      {
        heading: "5. Ergebnisse der KI-Agenten",
        paragraphs: [
          "Agenten erzeugen ihre Antworten mit einem Sprachmodell Dritter (Anthropic Claude). KI-Ergebnisse können ungenau, unvollständig oder veraltet sein: Du bist dafür verantwortlich, sie vor der Nutzung zu prüfen, und sie gelten nicht als rechtliche, steuerliche, medizinische oder finanzielle Beratung.",
          "Du bist verantwortlich für die Nachrichten und Daten, die du an Agenten sendest, und für die Entscheidungen, die du auf Grundlage ihrer Ergebnisse triffst. Sende keine besonderen Kategorien personenbezogener Daten (zum Beispiel Gesundheitsdaten) und keine Daten, die du nicht teilen darfst: Wie Gespräche verarbeitet werden - und dass sie nicht zum Trainieren von Modellen verwendet werden - ist in der Datenschutzerklärung (Abschnitte 6 und 13) beschrieben.",
          "Anweisungen an einen Agenten werden mit den von dir verbundenen Zugangsdaten ausgeführt: Behalte die menschliche Kontrolle über Aktionen mit Außenwirkung (E-Mails, Bestellungen, Rechnungen, Veröffentlichungen).",
        ],
      },
      {
        heading: "6. Integrationen und Dienste Dritter",
        paragraphs: [
          "Die Nutzung eines Agenten kann das Verbinden von Diensten Dritter erfordern. Mit dem Verbinden einer Integration ermächtigst du uns, im Rahmen der von dir freigegebenen Berechtigungen auf diesem Konto zu handeln: OAuth-Tokens sind im Ruhezustand verschlüsselt und werden nur verwendet, um die von dir ausgelösten Aktionen auszuführen.",
          "Du bestätigst, dass du berechtigt bist, diese Konten zu verbinden, und akzeptierst die Bedingungen des jeweiligen Anbieters (zum Beispiel Shopify, Google, Slack, Notion, HubSpot, Meta/WhatsApp). Dienste Dritter stehen nicht unter unserer Kontrolle: Verfügbarkeit, Preise und Bedingungen können sich ändern, und deren Einstellung kann den Dienst einschränken.",
          "Du kannst eine Integration jederzeit im Dashboard trennen; damit endet der Zugriff des Agenten.",
        ],
      },
      {
        heading: "7. Zulässige Nutzung",
        paragraphs: [
          "Du verpflichtest dich, den Dienst nicht zu verwenden für: rechtswidrige Zwecke oder die Verletzung von Rechten Dritter; den Versuch, Authentifizierung, Zugriffskontrollen, Plan- oder Tokenlimits zu umgehen; Reverse Engineering, Dekompilierung oder Extraktion des Quellcodes der Agenten; Spam, Belästigung, Malware, irreführende Inhalte oder rechtswidrige Kommunikation; Nachrichten, die täuschend eine Person oder Organisation nachahmen; Weiterverkauf oder Unterlizenzierung des Dienstes ohne unsere schriftliche Zustimmung; Überlastung der Infrastruktur, auch durch unverhältnismäßige automatisierte Anfragen.",
          "Wir können Konten sperren, die gegen diese Regeln verstoßen, wie im Abschnitt zu Sperrung und Kündigung beschrieben.",
        ],
      },
      {
        heading: "8. Geistiges Eigentum",
        paragraphs: [
          "Plattform, Agenten, Marke und von uns bereitgestellte Inhalte gehören AgentCloud oder ihren Lizenzgebern und sind gesetzlich geschützt: Wir räumen dir ein beschränktes, nicht ausschließliches und nicht übertragbares Nutzungsrecht für die Dauer deines Abonnements ein.",
          "Daten und Inhalte, die du hochlädst oder mit den Agenten erzeugst (Kundendaten, Angebote, Dokumente), bleiben deine. Du räumst uns eine Lizenz ein, sie nur im für die Erbringung des Dienstes erforderlichen Umfang zu verarbeiten, wie in der Datenschutzerklärung beschrieben.",
          "Von dir gesendetes Feedback und Anregungen sind nicht vertraulich und können zur Verbesserung des Dienstes genutzt werden.",
        ],
      },
      {
        heading: "9. Verfügbarkeit und Support",
        paragraphs: [
          "Wir bemühen uns, die Plattform verfügbar und sicher zu halten, garantieren aber keinen unterbrechungsfreien Dienst: Wartung, Updates oder Probleme bei unseren Anbietern können zu vorübergehenden Unterbrechungen führen. Soweit nicht für Enterprise-Pläne schriftlich vereinbart, bieten wir kein garantiertes Service-Level: Ansprüche bei längerer Nichtverfügbarkeit richten sich nach der Rückerstattungsrichtlinie.",
          "Support: support@agentcloud.agency, in der Regel innerhalb von 24 Stunden an Werktagen.",
        ],
      },
      {
        heading: "10. Rückerstattungen und Widerrufsrecht",
        paragraphs: [
          "AgentCloud erbringt digitale Dienste: Nach EU-Verbraucherrecht hast du 14 Tage Widerrufsrecht ab dem Kauf, das erlischt, sobald der Dienst mit deiner Zustimmung beginnt. Mit dem Abschluss eines Abos stimmst du dem sofortigen Beginn des Dienstes zu: Aktivierte Abonnements sind daher nicht erstattungsfähig, außer in den in der Rückerstattungsrichtlinie genannten Fällen, die integraler Bestandteil dieser Bedingungen ist.",
          "Kurz gefasst: Falsche oder doppelte Belastungen werden vollständig erstattet; eine längere, AgentCloud zurechenbare Nichtverfügbarkeit wird anteilig für den nicht genutzten Zeitraum erstattet; nicht genutzte Token-Kontingente verfallen und bereits abgerechneter Mehrverbrauch ist nicht erstattungsfähig.",
          "Wie du eine Erstattung beantragst und Bearbeitungszeiten: siehe Rückerstattungsrichtlinie (schreibe an legal@agentcloud.agency).",
        ],
      },
      {
        heading: "11. Sperrung und Kündigung",
        paragraphs: [
          "Du kannst jederzeit aufhören: Kündige das Abonnement im Dashboard oder Abrechnungsportal und lösche auf Wunsch dein Konto in den Kontoeinstellungen. Die Kündigung stoppt künftige Verlängerungen; die Kontolöschung entfernt deine Daten wie in der Datenschutzerklärung (Abschnitt 10) beschrieben, vorbehaltlich der gesetzlich aufbewahrungspflichtigen Unterlagen.",
          "Wir können den Dienst sperren oder beenden, nach Möglichkeit mit Vorankündigung, wenn: du gegen diese Bedingungen verstößt (insbesondere zulässige Nutzung); eine Zahlung fehlschlägt und nicht ausgeglichen wird; wir gesetzlich dazu verpflichtet sind; oder die weitere Erbringung ein rechtliches oder sicherheitstechnisches Risiko darstellen würde. Bei schweren Verstößen können wir den Zugang sofort sperren.",
          "Mit der Beendigung endet dein Nutzungsrecht, die Agenten stellen ihren Betrieb ein und bereits gezahlte Gebühren für den laufenden Zeitraum bleiben geschuldet; Klauseln, die ihrer Natur nach fortgelten (Haftung, geistiges Eigentum, anwendbares Recht), bleiben wirksam.",
        ],
      },
      {
        heading: "12. Personenbezogene Daten und Datenschutz",
        paragraphs: [
          "AgentCloud ist Verantwortlicher für die über den Dienst verarbeiteten personenbezogenen Daten. Welche Daten wir erheben, warum, wie lange wir sie speichern, an wen wir sie weitergeben und welche Rechte du hast (Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit, Widerruf der Einwilligung), ist in der Datenschutzerklärung beschrieben, die integraler Bestandteil dieser Bedingungen ist.",
          "Wenn du mit den Agenten personenbezogene Daten deiner Kunden verarbeitest, bist du deren Verantwortlicher und wir handeln als Auftragsverarbeiter: Schreibe an privacy@agentcloud.agency, um unseren Auftragsverarbeitungsvertrag (AVV) zu erhalten.",
          "Für Datenschutzanfragen und Beschwerden kannst du dich auch an die italienische Aufsichtsbehörde wenden, den Garante per la protezione dei dati personali.",
        ],
      },
      {
        heading: "13. Haftungsbeschränkung",
        paragraphs: [
          "Der Dienst wird wie besehen bereitgestellt, ohne Gewährleistungen jeglicher Art, soweit gesetzlich zulässig. Wir haften nicht für mittelbare oder Folgeschäden, entgangenen Gewinn, Datenverlust oder Betriebsunterbrechungen, die aus der Nutzung von KI-Agenten entstehen, einschließlich Fehlern in automatisierten Ergebnissen.",
          "Soweit gesetzlich zulässig, ist unsere Gesamthaftung für Ansprüche im Zusammenhang mit dem Dienst auf die Gebühren begrenzt, die du in den 12 Monaten vor dem anspruchsbegründenden Ereignis gezahlt hast. Nichts in diesen Bedingungen schließt die dir als Verbraucher zustehenden zwingenden Rechte oder unsere Haftung für Vorsatz und grobe Fahrlässigkeit aus oder beschränkt sie.",
        ],
      },
      {
        heading: "14. Änderungen der Bedingungen",
        paragraphs: [
          "Wir können diese Bedingungen aktualisieren, um Änderungen des Dienstes, unserer Anbieter oder der Rechtslage abzubilden. Wir veröffentlichen das Datum der letzten Aktualisierung oben auf dieser Seite und informieren dich bei wesentlichen Änderungen per E-Mail oder in der App, bevor sie wirksam werden. Die weitere Nutzung des Dienstes nach der Aktualisierung gilt als Zustimmung zu den überarbeiteten Bedingungen.",
        ],
      },
      {
        heading: "15. Anwendbares Recht und Streitbeilegung",
        paragraphs: [
          "Diese Bedingungen unterliegen italienischem Recht, unbeschadet der zwingenden Verbraucherschutzvorschriften deines Wohnsitzlandes. Als Verbraucher kannst du vor dem Gericht deines Wohnsitzes, Arbeitsplatzes oder gewöhnlichen Aufenthalts klagen; andernfalls sind die Gerichte in Italien zuständig.",
          "Als Verbraucher in der EU kannst du dich auch an das Netz der Europäischen Verbraucherzentren wenden, um Informationen zur außergerichtlichen Streitbeilegung zu erhalten.",
        ],
      },
      {
        heading: "16. Kontakt",
        paragraphs: [
          "Verträge, Abrechnung und Rückerstattungen: legal@agentcloud.agency",
          "Support und Konto: support@agentcloud.agency",
          "Personenbezogene Daten und DSGVO: privacy@agentcloud.agency",
        ],
      },
    ],
  },
  refunds: {
    title: "Rückerstattungsrichtlinie",
    lastUpdated: "Letzte Aktualisierung: September 2026",
    sections: [
      {
        heading: "1. Digitale Dienste und Widerrufsrecht",
        paragraphs: [
          "AgentCloud erbringt sofort bereitgestellte digitale Dienste. Nach EU-Verbraucherrecht hast du ein Widerrufsrecht von 14 Tagen ab dem Kauf, das erlischt, sobald der Dienst mit deiner ausdrücklichen Zustimmung beginnt.",
          "Mit dem Abschluss eines Abos verlangst du den sofortigen Beginn des Dienstes und erkennst an, dass aktivierte Abonnements daher nicht erstattungsfähig sind, außer in den in dieser Richtlinie beschriebenen Fällen, die integraler Bestandteil der Nutzungsbedingungen ist.",
        ],
      },
      {
        heading: "2. Fälle, in denen eine Rückerstattung fällig ist",
        paragraphs: [
          "Wir erstatten in folgenden Fällen:",
          "Falsche oder doppelte Belastungen: Der beanstandete Betrag wird vollständig erstattet, einschließlich angewandter Steuern.",
          "Längere Nichtverfügbarkeit, die AgentCloud zuzurechnen ist: Ist der abonnierte Agent aus von uns zu vertretenden Gründen nicht nutzbar, wird anteilig für den nicht genutzten Zeitraum erstattet (zum Beispiel entsprechen 15 Tage Ausfall bei einem Monatsabo 50 % der Gebühr).",
          "Nicht behobener Mangel: Erfüllt ein kostenpflichtiger Agent nicht die auf seiner Produktseite beschriebene Funktion und können wir dies nicht innerhalb von 15 Tagen nach deiner Meldung beheben, erstatten wir den nicht genutzten Teil des Zeitraums.",
        ],
      },
      {
        heading: "3. Fälle, in denen keine Rückerstattung fällig ist",
        paragraphs: [
          "Nicht genutzte Token-Kontingente verfallen zum nächsten Monat und werden nicht erstattet.",
          "Bereits abgerechneter Mehrverbrauch ist nicht erstattungsfähig: Er entspricht tatsächlich genutzter Verarbeitung, zu 0,30 € pro 1.000 zusätzliche Token innerhalb der Sicherheitsgrenze des Plans.",
          "Aktivierte und genutzte Abonnements sind außerhalb der oben genannten Fälle nicht erstattungsfähig, auch nicht, wenn du den Agenten einfach nicht mehr nutzt oder die Kündigung vor der Verlängerung vergisst.",
          "Konten, die wegen Verstoßes gegen die Nutzungsbedingungen gesperrt wurden (zum Beispiel rechtswidrige Nutzung oder Missbrauch der Infrastruktur), haben keinen Anspruch auf Rückerstattung.",
          "Für Störungen, die durch von dir verbundene Dienste Dritter oder durch deine eigenen Systeme und Zugangsdaten verursacht wurden, erstatten wir keine Gebühren.",
        ],
      },
      {
        heading: "4. Wie du eine Rückerstattung beantragst",
        paragraphs: [
          "Schreibe an legal@agentcloud.agency von der E-Mail-Adresse deines Kontos und gib an: Konto-E-Mail, betroffenen Agenten oder Abonnement, Datum und Betrag der Belastung sowie den Grund der Anfrage (mit Nachweisen, zum Beispiel Fehlermeldungen oder Screenshots).",
          "Wir prüfen Anfragen innerhalb von 5 Werktagen nach Eingang und antworten mit dem Ergebnis; benötigen wir weitere Informationen, läuft die Frist ab deiner Antwort neu. Anfragen, die mehr als 60 Tage nach der Belastung eingehen, können abgelehnt werden, vorbehaltlich zwingender gesetzlicher Rechte.",
        ],
      },
      {
        heading: "5. Zeitpunkt und Art der Rückerstattung",
        paragraphs: [
          "Genehmigte Rückerstattungen erfolgen über die ursprüngliche Zahlungsmethode (Stripe oder PayPal), in der Regel innerhalb von 5-10 Werktagen je nach Kartennetzwerk, PayPal und deiner Bank; der Zeitpunkt der Gutschrift hängt von deinem Anbieter ab.",
          "Rückerstattungen erfolgen in derselben Währung wie die Belastung (EUR). Wir können nicht auf eine andere Karte oder ein anderes Konto als das für die Zahlung verwendete erstatten.",
        ],
      },
      {
        heading: "6. Rückbuchungen und Zahlungsstreitigkeiten",
        paragraphs: [
          "Wenn du eine Belastung für falsch hältst, kontaktiere uns unter legal@agentcloud.agency, bevor du ein Verfahren bei deiner Bank, dem Kartennetzwerk oder PayPal einleitest: Fast immer können wir schneller lösen.",
          "Leitest du eine Rückbuchung ein, können wir das Abonnement und den Zugang zum Agenten während des Verfahrens aussetzen und dem Zahlungsanbieter die Aufzeichnungen zu Belastungen und Nutzung übermitteln. Endet das Verfahren zu deinen Gunsten, folgt die Erstattung dem Verfahren des Zahlungsanbieters.",
        ],
      },
      {
        heading: "7. Anwendbares Recht und zwingende Rechte",
        paragraphs: [
          "Diese Richtlinie unterliegt italienischem Recht. Keine ihrer Klauseln beschränkt oder ersetzt die zwingenden Schutzrechte, die dir das Verbraucherrecht gewährt; bei Widersprüchen gilt die für Verbraucher günstigere Regel.",
          "Als Verbraucher kannst du dich an deine nationale Verbraucherbehörde, das Netz der Europäischen Verbraucherzentren oder in Datenschutzfragen an den Garante per la protezione dei dati personali wenden. Zuständig sind die in den Nutzungsbedingungen genannten Gerichte.",
          "Abrechnungsverhältnisse zwischen Unternehmen (B2B) richten sich nach den Nutzungsbedingungen und der gegebenenfalls unterzeichneten Bestellung.",
        ],
      },
      {
        heading: "8. Kontakt",
        paragraphs: [
          "Rückerstattungen und Abrechnung: legal@agentcloud.agency",
          "Konto-Support: support@agentcloud.agency",
        ],
      },
    ],
  },
};

const FR: Record<LegalDocumentKey, LegalTranslation> = {
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : septembre 2026",
    sections: [
      {
        heading: "1. Qui nous sommes et responsable du traitement",
        paragraphs: [
          "AgentCloud (AgentCloud, nous) exploite le site et la plateforme disponibles sur agentcloud.agency et ses sous-domaines (le Service). AgentCloud est responsable du traitement des données personnelles décrites dans cette politique.",
          "Pour toute question relative à la confidentialité, y compris l'exercice de vos droits, écrivez-nous à privacy@agentcloud.agency ; pour l'assistance liée au compte et au produit, l'adresse est support@agentcloud.agency. Nous répondons aux demandes de confidentialité dans un délai de 30 jours.",
          "Cette politique couvre notre site, la plateforme AgentCloud et les agents IA auxquels vous vous abonnez. Elle ne couvre pas les sites et services tiers que vous choisissez de connecter à AgentCloud, régis par leurs propres politiques de confidentialité.",
        ],
      },
      {
        heading: "2. Ce que fait AgentCloud",
        paragraphs: [
          "AgentCloud est une plateforme sans code qui permet aux entreprises d'activer et de gérer des agents IA. Vous créez un compte, choisissez des agents dans le marketplace, connectez les outils que vous utilisez déjà (par exemple Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion ou HubSpot) et échangez avec les agents depuis notre interface web.",
          "Pour fournir ce service, nous traitons les données du compte, les données de facturation, les messages que vous échangez avec les agents, les données que les outils connectés transmettent aux agents et les données techniques nécessaires à la sécurité de la plateforme et à la mesure de la consommation.",
        ],
      },
      {
        heading: "3. Informations que nous collectons",
        paragraphs: [
          "Données de compte et de profil : nom, adresse e-mail, photo de profil (si vous vous connectez avec Google), méthode d'authentification, langue et préférences d'interface, date de création et statut du compte.",
          "Données d'authentification : l'inscription et la connexion sont gérées par Supabase Auth. Si vous vous inscrivez avec e-mail et mot de passe, notre fournisseur d'authentification ne conserve le mot de passe que sous forme de hachage salé : nous ne le voyons jamais et ne le stockons jamais en clair. Si vous vous connectez avec Google, nous recevons de Google votre nom, votre adresse e-mail et votre photo de profil.",
          "Données de facturation : l'offre et les agents souscrits, les montants, la devise, les factures, l'état du paiement, le pays de facturation et le type de moyen de paiement utilisé (par exemple carte, Klarna ou Amazon Pay). Les numéros de carte et les identifiants de paiement complets sont collectés et conservés directement par nos prestataires de paiement (Stripe et PayPal) ; ils ne transitent jamais par les serveurs d'AgentCloud, qui reçoivent uniquement un jeton, le réseau de la carte et les derniers chiffres.",
          "Données de conversation et d'usage : les messages que vous envoyez aux agents, les réponses générées, les outils ou intégrations que l'agent utilise pour votre compte, le nombre de jetons consommés et les horodatages. Ces données sont nécessaires pour produire les réponses, appliquer les limites de l'offre et facturer le dépassement.",
          "Données des intégrations connectées : lorsque vous connectez un outil tiers, nous conservons les jetons OAuth d'accès et de rafraîchissement que vous autorisez (chiffrés au repos) et les quelques métadonnées nécessaires pour identifier la connexion (par exemple le domaine de la boutique pour Shopify). Les actions de l'agent s'exécutent avec ces jetons uniquement lorsque vous les déclenchez.",
          "Données de formulaires et de communications : nom, prénom, adresse e-mail et contenu de votre message lorsque vous utilisez le formulaire de contact, demandez une démo ou rejoignez la liste d'attente.",
          "Données techniques et de sécurité : adresse IP, user agent et métadonnées des requêtes, utilisés pour la limitation de débit, la prévention des abus, le diagnostic des erreurs et les journaux de sécurité.",
        ],
      },
      {
        heading: "4. Comment nous collectons les informations",
        paragraphs: [
          "Directement auprès de vous, lorsque vous créez un compte, vous vous abonnez, échangez avec un agent, connectez une intégration ou remplissez l'un de nos formulaires.",
          "Auprès du fournisseur d'identité que vous choisissez, comme Google, ou des services tiers que vous connectez, qui nous transmettent les données dont l'agent a besoin pour exécuter la tâche demandée.",
          "Automatiquement, depuis votre navigateur ou appareil, via les cookies et technologies similaires décrits à la section 8.",
        ],
      },
      {
        heading: "5. Pourquoi nous utilisons vos données et sur quelle base légale",
        paragraphs: [
          "Pour fournir le Service que vous avez demandé (exécution d'un contrat) : créer et gérer votre compte, exécuter les agents souscrits, conserver l'historique de vos conversations, appliquer les limites d'offre et de jetons et assurer l'assistance.",
          "Pour traiter les paiements et respecter nos obligations fiscales et comptables (contrat et obligation légale) : émettre les factures, gérer les remboursements, prévenir la fraude au paiement et conserver les pièces comptables.",
          "Pour maintenir la plateforme sûre et fiable (intérêt légitime) : limitation de débit, prévention des abus et de la fraude, journaux de sécurité, débogage et protection de notre infrastructure.",
          "Pour envoyer les e-mails transactionnels et liés au compte (contrat) : messages de bienvenue, reçus, avis d'abonnement et de consommation, alertes de sécurité. Nous n'envoyons pas d'e-mails marketing sans votre consentement et vous pouvez vous désabonner des communications non essentielles à tout moment.",
          "Pour améliorer le Service (intérêt légitime) : statistiques agrégées sur l'usage et les erreurs, afin de corriger les problèmes et de prioriser les fonctionnalités. Nous n'utilisons pas le contenu de vos conversations pour entraîner des modèles.",
          "Pour respecter la loi (obligation légale) : répondre aux demandes légitimes des autorités et conserver les documents que nous sommes tenus de garder.",
        ],
      },
      {
        heading: "6. Traitement par IA de vos conversations",
        paragraphs: [
          "Les réponses des agents sont générées par un grand modèle de langage tiers (Anthropic Claude). Le contenu de vos messages, le contexte pertinent de la conversation et les résultats des outils connectés sont transmis au fournisseur du modèle uniquement pour générer la réponse demandée.",
          "Ni nous ni notre fournisseur de modèle n'utilisons le contenu de vos conversations pour entraîner des modèles d'IA. Vos conversations ne sont jamais vendues et ne servent pas à la publicité.",
          "N'envoyez pas aux agents de catégories particulières de données (par exemple des données de santé) ni de données que vous n'êtes pas autorisé à partager : les agents sont des outils d'automatisation généralistes et ne sont pas conçus pour ces contenus.",
        ],
      },
      {
        heading: "7. Partage des données",
        paragraphs: [
          "Nous ne vendons pas vos données personnelles et ne les partageons pas avec des tiers pour leurs propres finalités marketing.",
          "Nous partageons des données avec les prestataires (sous-traitants) qui exploitent le Service pour notre compte : Supabase (base de données et authentification) ; Stripe et PayPal (paiements, facturation et remboursements) ; Resend (envoi des e-mails transactionnels) ; Anthropic (inférence du modèle d'IA) ; Google (connexion avec Google et, si vous les connectez, Gmail, Google Calendar et Google Sheets) ; le fournisseur de l'intégration que vous choisissez de connecter (par exemple Shopify, Slack, Notion ou HubSpot) ; et Vercel (hébergement et analyse web agrégée).",
          "Ces prestataires ne peuvent accéder aux données personnelles que pour fournir le service pour notre compte, dans un cadre contractuel, et sont tenus de les protéger. La liste à jour de nos sous-traitants est disponible sur demande à privacy@agentcloud.agency.",
          "Nous pouvons également communiquer des données lorsque la loi l'exige, pour respecter une obligation légale ou pour protéger les droits, la sécurité et l'intégrité d'AgentCloud, de nos utilisateurs ou du public.",
          "Si AgentCloud participe à une fusion, une acquisition ou une cession d'actifs, les données peuvent être transférées à l'entité successeur ; nous vous en informerons et cette politique continuera de s'appliquer à vos données jusqu'à sa mise à jour.",
        ],
      },
      {
        heading: "8. Cookies et technologies similaires",
        paragraphs: [
          "Nous utilisons un nombre limité de cookies, tous nécessaires au fonctionnement du Service. Les cookies d'authentification Supabase maintiennent votre session ouverte. Un cookie de préférence enregistre votre langue et un autre votre thème clair ou sombre, pour que le site s'ouvre avec la bonne langue et la bonne apparence. Un cookie de courte durée est déposé pendant les parcours de liste d'attente ou d'autorisation OAuth, afin de les protéger contre la falsification.",
          "Certaines informations sont stockées localement dans votre navigateur plutôt que dans un cookie, par exemple le contenu de votre panier. Vous pouvez les effacer en vidant le panier ou en supprimant les données du navigateur.",
          "Nous utilisons Vercel Analytics et Speed Insights pour comprendre le trafic agrégé et les performances. Ils respectent la vie privée et n'utilisent pas de cookies pour vous profiler entre les sites ; nous n'utilisons pas de cookies publicitaires ni de suivi inter-sites. Comme nous n'employons que des technologies techniquement nécessaires et une mesure agrégée, aucune bannière de consentement n'est requise ; vous pouvez néanmoins bloquer les cookies dans votre navigateur, sachant que certaines parties du Service (par exemple la session) cesseront de fonctionner.",
        ],
      },
      {
        heading: "9. Transferts internationaux de données",
        paragraphs: [
          "Certains de nos prestataires sont situés hors de l'Espace économique européen, notamment aux États-Unis (par exemple Vercel, Supabase, Anthropic et Stripe). Lorsque des données personnelles sont transférées hors de l'EEE, nous nous appuyons sur les clauses contractuelles types de la Commission européenne et, le cas échéant, sur la certification du prestataire au titre du cadre de protection des données UE-États-Unis, ainsi que sur des mesures techniques telles que le chiffrement en transit et au repos.",
        ],
      },
      {
        heading: "10. Durée de conservation des données",
        paragraphs: [
          "Données de compte et de profil : tant que votre compte est actif et jusqu'à 30 jours après sa suppression, afin de finaliser l'effacement dans les sauvegardes.",
          "Historique des conversations et enregistrements d'usage : jusqu'à 12 mois, ou jusqu'à la suppression de la conversation ou de votre compte si elle intervient avant.",
          "Factures, pièces de facturation et pièces fiscales : 10 ans, comme l'exige la réglementation fiscale italienne, même après la résiliation de l'abonnement.",
          "Jetons des intégrations : jusqu'à la déconnexion de l'intégration ou la suppression de votre compte, et en tout état de cause supprimés chez le fournisseur lorsque vous révoquez l'accès. Les jetons sont chiffrés au repos.",
          "Demandes de liste d'attente, de contact et de démo : jusqu'à 24 mois après notre dernier contact.",
          "Journaux de sécurité et compteurs de limitation de débit : 12 mois au maximum (les compteurs sont généralement conservés de quelques heures à quelques jours).",
        ],
      },
      {
        heading: "11. Sécurité",
        paragraphs: [
          "Nous protégeons vos données par des mesures techniques et organisationnelles : chiffrement TLS en transit, chiffrement AES-256-GCM des jetons OAuth tiers au repos, règles d'accès à la base de données (row level security) limitant les données au compte propriétaire, secrets chiffrés gérés uniquement côté serveur, accès aux systèmes selon le principe du moindre privilège et limitation de débit contre les abus.",
          "Aucune méthode de transmission ou de stockage n'est sûre à 100 %. Si nous avons connaissance d'une violation de données personnelles susceptible d'engendrer un risque pour vos droits, nous vous en informerons et notifierons l'autorité de contrôle compétente sans retard injustifié.",
        ],
      },
      {
        heading: "12. Vos droits",
        paragraphs: [
          "Si vous vous trouvez dans l'Espace économique européen (ou dans une autre juridiction aux règles équivalentes), vous disposez des droits suivants : accéder à vos données personnelles et en recevoir une copie ; rectifier les données inexactes ; effacer les données lorsqu'aucune obligation légale impérieuse de conservation ne s'y oppose ; limiter le traitement ou vous y opposer, y compris lorsqu'il est fondé sur l'intérêt légitime ; recevoir dans un format structuré et lisible par machine les données que vous avez fournies (portabilité) ; retirer votre consentement à tout moment, sans affecter la licéité du traitement antérieur.",
          "Pour exercer ces droits, écrivez à privacy@agentcloud.agency depuis l'adresse e-mail de votre compte. Nous répondons dans un délai de 30 jours et ne facturons rien pour une demande raisonnable. Vous pouvez aussi supprimer votre compte directement depuis les paramètres de votre compte.",
          "Si vous estimez que vos données sont traitées illégalement, vous pouvez introduire une réclamation auprès de l'autorité de contrôle compétente — en Italie, le Garante per la protezione dei dati personali (www.garanteprivacy.it) — ou auprès de l'autorité de votre résidence habituelle, de votre lieu de travail ou du lieu de la violation alléguée.",
        ],
      },
      {
        heading: "13. Décisions automatisées et mineurs",
        paragraphs: [
          "Nous ne prenons pas de décisions produisant des effets juridiques ou similaires à votre égard par un traitement automatisé sans intervention humaine, et nous ne vous profilons pas à des fins publicitaires.",
          "Le Service est un outil professionnel et n'est pas destiné aux mineurs. Vous devez avoir au moins 16 ans (ou 14 ans, l'âge minimum prévu par la loi italienne pour consentir aux services de la société de l'information) pour créer un compte. Nous ne collectons pas sciemment de données de mineurs en dessous de cet âge ; si vous pensez qu'un mineur nous a transmis des données personnelles, contactez-nous et nous les supprimerons.",
        ],
      },
      {
        heading: "14. Modifications de cette politique",
        paragraphs: [
          "Nous pouvons mettre à jour cette politique pour refléter des changements du Service, de nos prestataires ou de la loi. En cas de modification substantielle, nous mettrons à jour la date en haut de cette page et, si le changement est significatif, nous vous en informerons par e-mail ou dans l'application avant son entrée en vigueur. Continuer à utiliser le Service après la mise à jour vaut acceptation de la politique révisée.",
        ],
      },
      {
        heading: "15. Contact",
        paragraphs: [
          "Demandes de confidentialité, droits des personnes concernées et signalements de sécurité : privacy@agentcloud.agency",
          "Assistance compte et service : support@agentcloud.agency",
        ],
      },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    lastUpdated: "Dernière mise à jour : septembre 2026",
    sections: [
      {
        heading: "1. Acceptation des conditions",
        paragraphs: [
          "Ces conditions d'utilisation régissent votre accès à AgentCloud et son utilisation, le site et la plateforme disponibles sur agentcloud.agency et ses sous-domaines (le Service), exploités par AgentCloud (nous). En créant un compte, en souscrivant à un agent ou en utilisant le Service, vous acceptez ces conditions.",
          "Ces conditions sont complétées par notre Politique de confidentialité (traitement des données personnelles) et notre Politique de remboursement (facturation et remboursements) : si vous ne les acceptez pas, n'utilisez pas le Service.",
          "Si vous acceptez pour le compte d'une entreprise ou d'une autre organisation, vous confirmez être habilité à l'engager et cette organisation est responsable du respect de ces conditions.",
        ],
      },
      {
        heading: "2. Description du Service",
        paragraphs: [
          "AgentCloud est une plateforme sans code qui vous permet d'activer et de gérer des agents IA. Vous choisissez des agents dans le marketplace, connectez les outils que vous utilisez déjà (par exemple Shopify, Gmail, Google Calendar, Google Sheets, Slack, Notion ou HubSpot) et interagissez avec les agents via notre interface web. Chaque agent est décrit sur sa page produit, avec les fonctionnalités utilisées et son prix.",
          "Le Service est un outil d'automatisation professionnelle qui évolue : nous pouvons ajouter, modifier ou retirer des agents ou fonctionnalités, sans réduire substantiellement, pendant une période déjà payée, les fonctionnalités que vous avez achetées.",
          "AgentCloud n'est pas un cabinet d'avocats, un cabinet comptable, un médecin ni un conseiller financier, et le Service ne fournit pas de conseil professionnel.",
        ],
      },
      {
        heading: "3. Création de compte et sécurité",
        paragraphs: [
          "Une adresse e-mail valide est nécessaire pour créer un compte. L'authentification est gérée par Supabase Auth : vous pouvez vous inscrire avec e-mail et mot de passe ou avec votre compte Google.",
          "Vous devez avoir au moins 16 ans (ou 14 ans, l'âge minimum prévu par la loi italienne pour consentir aux services de la société de l'information) et fournir des informations exactes. Un compte par personne ou entreprise : vous êtes responsable de tout ce qui se produit via votre compte et devez garder vos identifiants confidentiels.",
          "Signalez-nous immédiatement à support@agentcloud.agency tout soupçon d'accès non autorisé à votre compte ou tout incident de sécurité concernant le Service.",
        ],
      },
      {
        heading: "4. Abonnements, facturation et taxes",
        paragraphs: [
          "Chaque agent est vendu comme un abonnement mensuel distinct, au prix indiqué sur la page de l'agent. Tous les prix sont en EUR et hors taxes applicables ; la TVA est appliquée lorsque la loi l'exige. Les paiements sont traités par nos prestataires Stripe et PayPal et peuvent être effectués par carte, Klarna, Amazon Pay ou d'autres moyens qu'ils prennent en charge. Les frais sont facturés d'avance chaque mois et l'abonnement se renouvelle automatiquement jusqu'à résiliation.",
          "Vous pouvez résilier à tout moment depuis le tableau de bord ou le portail de facturation : la résiliation prend effet à la fin de la période en cours, vous conservez l'accès à l'agent jusqu'à cette date et n'êtes plus débité.",
          "Chaque offre comprend une allocation mensuelle de jetons. La consommation au-delà de l'allocation est facturée à l'usage à 0,30 € par 1 000 jetons supplémentaires, jusqu'à un plafond de sécurité égal au double de l'allocation de l'offre, au-delà duquel les exécutions sont suspendues.",
          "Si un paiement est refusé ou échoue, nous pouvons réessayer le débit sur le moyen de paiement enregistré. En cas de défaut de paiement, nous pouvons suspendre l'accès et, avec préavis, résilier l'abonnement.",
          "Nous pouvons modifier les prix et les conditions des offres : les changements sont communiqués à l'avance et s'appliquent à partir du renouvellement suivant. Les prix, factures et pièces fiscales sont conservés comme décrit dans la Politique de confidentialité.",
        ],
      },
      {
        heading: "5. Résultats des agents IA",
        paragraphs: [
          "Les agents génèrent leurs réponses avec un grand modèle de langage tiers (Anthropic Claude). Le résultat de l'IA peut être inexact, incomplet ou obsolète : il vous appartient de le vérifier avant de vous y fier, et il ne peut pas être considéré comme un conseil juridique, fiscal, médical ou financier.",
          "Vous êtes responsable des messages et des données que vous envoyez aux agents ainsi que des décisions que vous prenez sur la base de leurs résultats. N'envoyez pas de catégories particulières de données personnelles (par exemple des données de santé) ni de données que vous n'êtes pas autorisé à partager : le traitement des conversations — et le fait qu'elles ne servent pas à entraîner des modèles — est décrit dans la Politique de confidentialité (sections 6 et 13).",
          "Les instructions que vous donnez à un agent s'exécutent avec les identifiants que vous avez connectés : gardez un contrôle humain sur les actions ayant des effets externes (e-mails, commandes, factures, publications).",
        ],
      },
      {
        heading: "6. Intégrations et services tiers",
        paragraphs: [
          "L'utilisation d'un agent peut nécessiter la connexion de services tiers. En connectant une intégration, vous nous autorisez à agir sur ce compte dans les limites des permissions que vous approuvez : les jetons OAuth sont chiffrés au repos et utilisés uniquement pour exécuter les actions que vous déclenchez.",
          "Vous confirmez être en droit de connecter ces comptes et acceptez les conditions du fournisseur concerné (par exemple Shopify, Google, Slack, Notion, HubSpot, Meta/WhatsApp). Les services tiers ne dépendent pas de nous : leur disponibilité, leurs prix et leurs conditions peuvent changer, et leur arrêt peut limiter le Service.",
          "Vous pouvez déconnecter une intégration à tout moment depuis le tableau de bord, ce qui met fin à l'accès de l'agent.",
        ],
      },
      {
        heading: "7. Utilisation acceptable",
        paragraphs: [
          "Vous vous engagez à ne pas : utiliser le Service à des fins illégales ou portant atteinte aux droits de tiers ; tenter de contourner l'authentification, les contrôles d'accès, les limites d'offre ou de jetons ; procéder à l'ingénierie inverse, à la décompilation ou à l'extraction du code source des agents ; utiliser le Service pour générer du spam, du harcèlement, des malwares, des contenus trompeurs ou des communications illicites ; envoyer des messages usurpant de manière trompeuse l'identité d'une personne ou d'une organisation ; revendre ou sous-licencier le Service sans notre accord écrit ; surcharger l'infrastructure, y compris par des requêtes automatisées disproportionnées.",
          "Nous pouvons suspendre les comptes qui enfreignent ces règles, comme décrit dans la section relative à la suspension et à la résiliation.",
        ],
      },
      {
        heading: "8. Propriété intellectuelle",
        paragraphs: [
          "La plateforme, les agents, la marque et les contenus que nous fournissons appartiennent à AgentCloud ou à ses concédants et sont protégés par la loi : nous vous accordons un droit d'utilisation limité, non exclusif et non transférable pour la durée de votre abonnement.",
          "Les données et contenus que vous téléchargez ou générez avec les agents (données de vos clients, devis, documents) restent les vôtres. Vous nous accordez une licence pour les traiter uniquement dans la mesure nécessaire à la fourniture du Service, comme décrit dans la Politique de confidentialité.",
          "Les retours et suggestions que vous nous envoyez ne sont pas confidentiels et peuvent être utilisés pour améliorer le Service.",
        ],
      },
      {
        heading: "9. Disponibilité et support",
        paragraphs: [
          "Nous travaillons à maintenir la plateforme disponible et sûre, mais nous ne garantissons pas un service ininterrompu : la maintenance, les mises à jour ou les problèmes chez nos prestataires peuvent provoquer des interruptions temporaires. Sauf accord écrit pour les offres enterprise, nous n'offrons pas de niveau de service garanti : les remèdes en cas d'indisponibilité prolongée sont ceux prévus par la Politique de remboursement.",
          "Support : support@agentcloud.agency, généralement sous 24 heures les jours ouvrés.",
        ],
      },
      {
        heading: "10. Remboursements et droit de rétractation",
        paragraphs: [
          "AgentCloud fournit des services numériques : en vertu du droit de la consommation de l'UE, vous disposez d'un droit de rétractation de 14 jours à compter de l'achat, qui s'éteint dès que le service commence avec votre consentement. En vous abonnant, vous consentez au démarrage immédiat du service : les abonnements activés ne sont donc pas remboursables, sauf dans les cas énumérés dans la Politique de remboursement, qui fait partie intégrante des présentes conditions.",
          "En résumé : les débits erronés ou en double sont remboursés intégralement ; une indisponibilité prolongée imputable à AgentCloud est remboursée au prorata de la période non utilisée ; les allocations de jetons non utilisées ne sont pas reportées et le dépassement déjà facturé n'est pas remboursable.",
          "Comment en faire la demande et délais de traitement : voir la Politique de remboursement (écrivez à legal@agentcloud.agency).",
        ],
      },
      {
        heading: "11. Suspension et résiliation",
        paragraphs: [
          "Vous pouvez arrêter à tout moment : résiliez l'abonnement depuis le tableau de bord ou le portail de facturation et, si vous le souhaitez, supprimez votre compte dans les paramètres de votre compte. La résiliation met fin aux renouvellements futurs ; la suppression du compte efface vos données comme décrit dans la Politique de confidentialité (section 10), sous réserve des documents que nous devons conserver en vertu de la loi.",
          "Nous pouvons suspendre ou résilier le Service, avec préavis lorsque c'est possible, si : vous manquez à ces conditions (en particulier l'utilisation acceptable) ; un paiement échoue et n'est pas régularisé ; la loi nous y oblige ; ou la poursuite du Service créerait un risque juridique ou de sécurité. En cas de manquement grave, nous pouvons suspendre l'accès immédiatement.",
          "À la résiliation, votre droit d'utilisation prend fin, les agents cessent de fonctionner et les frais déjà payés pour la période en cours restent dus ; les clauses qui par nature survivent (responsabilité, propriété intellectuelle, droit applicable) continuent de s'appliquer.",
        ],
      },
      {
        heading: "12. Données personnelles et confidentialité",
        paragraphs: [
          "AgentCloud est responsable du traitement des données personnelles traitées via le Service. Quelles données nous collectons, pourquoi, combien de temps nous les conservons, avec qui nous les partageons et quels sont vos droits (accès, rectification, effacement, limitation, opposition, portabilité, retrait du consentement) sont décrits dans la Politique de confidentialité, qui fait partie intégrante des présentes conditions.",
          "Si vous traitez les données personnelles de vos clients avec les agents, vous en êtes le responsable et nous agissons comme sous-traitant : écrivez à privacy@agentcloud.agency pour recevoir notre accord de traitement des données (DPA).",
          "Pour les demandes et réclamations en matière de confidentialité, vous pouvez également vous adresser à l'autorité de contrôle italienne, le Garante per la protezione dei dati personali.",
        ],
      },
      {
        heading: "13. Limitation de responsabilité",
        paragraphs: [
          "Le Service est fourni en l'état, sans garantie d'aucune sorte dans la mesure permise par la loi. Nous ne sommes pas responsables des dommages indirects ou consécutifs, de la perte de bénéfices, de la perte de données ou de l'interruption d'activité résultant de l'utilisation d'agents IA, y compris les erreurs dans les résultats automatisés.",
          "Dans la mesure permise par la loi, notre responsabilité totale pour les réclamations liées au Service est limitée aux frais que vous avez payés au cours des 12 mois précédant l'événement à l'origine de la réclamation. Aucune clause de ces conditions n'exclut ou ne limite les droits que le droit de la consommation vous accorde en tant que consommateur, ni notre responsabilité en cas de dol ou de faute lourde.",
        ],
      },
      {
        heading: "14. Modifications des conditions",
        paragraphs: [
          "Nous pouvons mettre à jour ces conditions pour refléter des changements du Service, de nos prestataires ou de la loi. Nous publions la date de la dernière mise à jour en haut de cette page et, en cas de changement substantiel, nous vous informons par e-mail ou dans l'application avant son entrée en vigueur. Continuer à utiliser le Service après la mise à jour vaut acceptation des conditions révisées.",
        ],
      },
      {
        heading: "15. Droit applicable et règlement des litiges",
        paragraphs: [
          "Ces conditions sont régies par le droit italien, sans préjudice des protections impératives des consommateurs de votre pays de résidence. Si vous êtes consommateur, vous pouvez agir devant le tribunal de votre lieu de résidence, de travail ou de domicile ; dans les autres cas, les tribunaux italiens sont compétents.",
          "Si vous êtes un consommateur dans l'UE, vous pouvez également vous adresser au réseau des Centres européens des consommateurs pour connaître les modes de règlement extrajudiciaire des litiges.",
        ],
      },
      {
        heading: "16. Contact",
        paragraphs: [
          "Contrats, facturation et remboursements : legal@agentcloud.agency",
          "Support et compte : support@agentcloud.agency",
          "Données personnelles et RGPD : privacy@agentcloud.agency",
        ],
      },
    ],
  },
  refunds: {
    title: "Politique de remboursement",
    lastUpdated: "Dernière mise à jour : septembre 2026",
    sections: [
      {
        heading: "1. Services numériques et droit de rétractation",
        paragraphs: [
          "AgentCloud fournit des services numériques à exécution immédiate. En vertu du droit de la consommation de l'UE, vous disposez d'un droit de rétractation de 14 jours à compter de l'achat, qui s'éteint dès que le service commence avec votre consentement exprès.",
          "En vous abonnant, vous demandez le démarrage immédiat du service et reconnaissez que les abonnements activés ne sont donc pas remboursables, sauf dans les cas décrits dans cette politique, qui fait partie intégrante des Conditions d'utilisation.",
        ],
      },
      {
        heading: "2. Cas donnant droit à remboursement",
        paragraphs: [
          "Nous remboursons dans les cas suivants :",
          "Débits erronés ou en double : le montant contesté est remboursé intégralement, y compris les taxes appliquées.",
          "Indisponibilité prolongée imputable à AgentCloud : si l'agent souscrit n'est pas utilisable pour des raisons qui nous incombent, le remboursement est proportionnel à la période non utilisée (par exemple 15 jours d'indisponibilité sur un abonnement mensuel correspondent à 50 % des frais).",
          "Défaut non résolu : si un agent payant n'exécute pas la fonction décrite sur sa page produit et que nous ne pouvons pas corriger le problème dans les 15 jours suivant votre signalement, nous remboursons la partie non utilisée de la période.",
        ],
      },
      {
        heading: "3. Cas ne donnant pas droit à remboursement",
        paragraphs: [
          "Les allocations de jetons non utilisées ne sont pas reportées sur le mois suivant et ne sont pas remboursées.",
          "Le dépassement déjà facturé n'est pas remboursable : il correspond à un traitement que vous avez réellement utilisé, à 0,30 € par 1 000 jetons supplémentaires dans la limite du plafond de sécurité de l'offre.",
          "Les abonnements activés et utilisés ne sont pas remboursables en dehors des cas ci-dessus, y compris si vous cessez simplement d'utiliser l'agent ou oubliez de résilier avant le renouvellement.",
          "Les comptes suspendus pour manquement aux Conditions d'utilisation (par exemple usage illicite ou abus de l'infrastructure) ne donnent pas droit à remboursement.",
          "Nous ne remboursons pas les frais pour des dysfonctionnements causés par des services tiers que vous avez connectés ou par vos propres systèmes et identifiants.",
        ],
      },
      {
        heading: "4. Comment demander un remboursement",
        paragraphs: [
          "Écrivez à legal@agentcloud.agency depuis l'adresse e-mail de votre compte en précisant : l'e-mail du compte, l'agent ou l'abonnement concerné, la date et le montant du débit, ainsi que le motif de la demande (avec des preuves le cas échéant, par exemple messages d'erreur ou captures d'écran).",
          "Nous examinons les demandes dans un délai de 5 jours ouvrés à compter de leur réception et répondons avec le résultat ; si nous avons besoin d'informations complémentaires, le délai repart de votre réponse. Les demandes envoyées plus de 60 jours après le débit peuvent être refusées, sous réserve des droits légaux impératifs.",
        ],
      },
      {
        heading: "5. Délais et modalités de remboursement",
        paragraphs: [
          "Les remboursements approuvés sont effectués via le moyen de paiement d'origine (Stripe ou PayPal), généralement sous 5 à 10 jours ouvrés selon le réseau de la carte, PayPal et votre banque ; le délai de crédit dépend de votre prestataire.",
          "Les remboursements sont effectués dans la même devise que le débit (EUR). Nous ne pouvons pas rembourser sur une carte ou un compte différent de celui utilisé pour le paiement.",
        ],
      },
      {
        heading: "6. Contestations de paiement et chargebacks",
        paragraphs: [
          "Si vous estimez qu'un débit est erroné, contactez-nous à legal@agentcloud.agency avant d'ouvrir un litige auprès de votre banque, du réseau de la carte ou de PayPal : nous pouvons presque toujours résoudre le problème plus rapidement.",
          "Si vous ouvrez un chargeback, nous pouvons suspendre l'abonnement et l'accès à l'agent pendant la procédure, et transmettre au prestataire de paiement les enregistrements des débits et de l'usage. Si le litige est tranché en votre faveur, le remboursement suit la procédure du prestataire.",
        ],
      },
      {
        heading: "7. Droit applicable et droits impératifs",
        paragraphs: [
          "Cette politique est régie par le droit italien. Aucune de ses clauses ne limite ou ne remplace les protections impératives que le droit de la consommation vous accorde ; en cas de conflit, la règle la plus favorable au consommateur prévaut.",
          "En tant que consommateur, vous pouvez vous adresser à votre autorité nationale de la consommation, au réseau des Centres européens des consommateurs ou, pour les données personnelles, au Garante per la protezione dei dati personali. Les tribunaux compétents sont ceux indiqués dans les Conditions d'utilisation.",
          "Les relations de facturation entre entreprises (B2B) sont régies par les Conditions d'utilisation et, le cas échéant, par la commande signée.",
        ],
      },
      {
        heading: "8. Contact",
        paragraphs: [
          "Remboursements et facturation : legal@agentcloud.agency",
          "Assistance compte : support@agentcloud.agency",
        ],
      },
    ],
  },
};

const BASE: Record<"it" | "en", Record<LegalDocumentKey, LegalTranslation>> = { it: IT, en: EN };

const TRANSLATIONS: Record<"es" | "de" | "fr", Record<LegalDocumentKey, LegalTranslation>> = {
  es: ES,
  de: DE,
  fr: FR,
};

/** Documento legale completo nella lingua richiesta. */
export function getLegalDocument(
  locale: Locale,
  key: LegalDocumentKey,
): LegalDocument {
  // `backHome` è l'unica stringa che resta nel dizionario, già localizzata.
  const { backHome } = getDictionary(locale).legal[key];
  const document =
    locale === "es" || locale === "de" || locale === "fr"
      ? TRANSLATIONS[locale][key]
      : BASE[locale][key];
  return { backHome, ...document };
}
