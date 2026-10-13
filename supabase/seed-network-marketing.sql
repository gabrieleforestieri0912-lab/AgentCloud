-- Network Marketing Agent — seed: template conformi + 44 casi di test
--
-- Idempotente (ON CONFLICT / upsert sulla chiave naturale).
-- I casi verificano `src/lib/network-marketing/compliance.ts`: ogni riga
-- dichiara l'esito atteso (green/yellow/red) e la regola attesa.

-- === TEMPLATE CONFORMI DI ESEMPIO (account demo: sostituire account_id) ===
-- INSERT INTO nm_templates (account_id, kind, text, locale, compliance_status) VALUES
--   ('00000000-0000-0000-0000-000000000000', 'approccio',
--    'Ciao {nome}, ti scrivo come Incaricata indipendente di {azienda}: ho pensato a te per {prodotto} perché {motivo}. Se ti va, ti mando il catalogo senza impegno. A presto!',
--    'it', 'green')
-- ON CONFLICT DO NOTHING;

-- === 44 CASI DI TEST DEL COMPLIANCE-CHECK (tutti in italiano) ===
INSERT INTO nm_compliance_cases (id, text, expected, expected_rule) VALUES
  -- NM-01 guadagni (red, 10 casi)
  ('NM-T01', 'Unisciti al mio team e avrai guadagni garantiti ogni mese!', 'red', 'NM-01-guadagni'),
  ('NM-T02', 'Con noi raggiungi la libertà finanziaria in un anno.', 'red', 'NM-01-guadagni'),
  ('NM-T03', 'Ti spiego come avere una rendita automatica senza fare nulla.', 'red', 'NM-01-guadagni'),
  ('NM-T04', 'I nostri incaricati prendono 3000€ al mese: entra anche tu.', 'red', 'NM-01-guadagni'),
  ('NM-T05', 'Si guadagnano 3000 euro al mese lavorando da casa.', 'red', 'NM-01-guadagni'),
  ('NM-T06', 'Lascia il lavoro: con questo sistema vivi di entrate passive.', 'red', 'NM-01-guadagni'),
  ('NM-T07', 'Diventa ricco con il network marketing, soldi facili per tutti.', 'red', 'NM-01-guadagni'),
  ('NM-T08', 'Reddito garantito di 5000 euro mensili senza lavorare.', 'red', 'NM-01-guadagni'),
  ('NM-T09', 'Licenziati e unisciti a noi: ti arricchirai in pochi mesi.', 'red', 'NM-01-guadagni'),
  ('NM-T10', 'Guadagni fino a 2000 euro extra: scrivimi per iniziare.', 'red', 'NM-01-guadagni'),
  -- NM-02 salute (red, 10 casi)
  ('NM-T11', 'Questo integratore cura il diabete in modo naturale.', 'red', 'NM-02-salute'),
  ('NM-T12', 'Le nostre gocce guariscono i dolori articolari.', 'red', 'NM-02-salute'),
  ('NM-T13', 'Bevi questo succo e perdi 5 kg in due settimane.', 'red', 'NM-02-salute'),
  ('NM-T14', 'Dimagrisci garantito con il nostro programma detox.', 'red', 'NM-02-salute'),
  ('NM-T15', 'Prodotto clinicamente provato contro il colesterolo.', 'red', 'NM-02-salute'),
  ('NM-T16', 'Previene il cancro grazie agli antiossidanti naturali.', 'red', 'NM-02-salute'),
  ('NM-T17', 'Ho perso 8 kg in un mese con queste capsule.', 'red', 'NM-02-salute'),
  ('NM-T18', 'Rafforza il sistema immunitario e abbassa il colesterolo.', 'red', 'NM-02-salute'),
  ('NM-T19', 'Tisana che disintossica il fegato e guarisce la pelle.', 'red', 'NM-02-salute'),
  ('NM-T20', 'Crema antitumorale approvata dal ministero: provala.', 'red', 'NM-02-salute'),
  -- NM-03 trasparenza (red, 4 casi)
  ('NM-T21', 'Ti invito a un colloquio di lavoro per una grande opportunità.', 'red', 'NM-03-trasparenza'),
  ('NM-T22', 'Non è vendita, non devi vendere nulla: solo condividere.', 'red', 'NM-03-trasparenza'),
  ('NM-T23', 'Offerta di lavoro da casa senza vendere: candidati ora.', 'red', 'NM-03-trasparenza'),
  ('NM-T24', 'Vieni al colloquio di lavoro giovedì, ti spiego tutto.', 'red', 'NM-03-trasparenza'),
  -- NM-04 reclutamento (red, 3 casi)
  ('NM-T25', 'Guadagni solo reclutando amici, senza vendere nulla.', 'red', 'NM-04-reclutamento'),
  ('NM-T26', 'Il guadagno dal reclutamento è automatico ogni mese.', 'red', 'NM-04-reclutamento'),
  ('NM-T27', 'Vieni pagata per reclutare: non serve vendere, basta invitare.', 'red', 'NM-04-reclutamento'),
  -- NM-05 pressione (yellow, 6 casi)
  ('NM-T28', 'Ultimi posti per la presentazione di giovedì, affrettati!', 'yellow', 'NM-05-pressione'),
  ('NM-T29', 'Offerta scade stasera: solo oggi al prezzo lancio.', 'yellow', 'NM-05-pressione'),
  ('NM-T30', 'Non perdere questa occasione, ultima occasione per entrare.', 'yellow', 'NM-05-pressione'),
  ('NM-T31', 'Posti limitati: solo per i primi 10 che rispondono.', 'yellow', 'NM-05-pressione'),
  ('NM-T32', 'Se non decidi ora perdi il posto nel mio team.', 'yellow', 'NM-05-pressione'),
  ('NM-T33', 'La promozione scade domani a mezzanotte, sbrigati.', 'yellow', 'NM-05-pressione'),
  -- NM-06/07/08 (yellow, 6 casi)
  ('NM-T34', 'Nessun rischio e senza rischi: entra senza pensieri.', 'yellow', 'NM-06-senza-rischio'),
  ('NM-T35', 'Ho guadagnato 2000 euro il primo mese con questo sistema.', 'yellow', 'NM-07-testimonianze'),
  ('NM-T36', 'Guarda il mio prima e dopo: risultato in solo 20 giorni.', 'yellow', 'NM-07-testimonianze'),
  ('NM-T37', 'Sei disoccupata? Questo fa per te, senza reddito non resti.', 'yellow', 'NM-08-vulnerabili'),
  ('NM-T38', 'Hai dei debiti? Con noi li ripaghi in fretta.', 'yellow', 'NM-08-vulnerabili'),
  ('NM-T39', 'La pensione non basta: arrotondare la pensione è facile.', 'yellow', 'NM-08-vulnerabili'),
  -- Verdi (green, 5 casi)
  ('NM-T40', 'Ciao Marta, ti scrivo come Incaricata indipendente di Lumina: ho pensato a te per la linea viso perché me ne avevi parlato. Ti mando il catalogo? Nessun impegno da parte tua.', 'green', ''),
  ('NM-T41', 'Ciao Luca, ti andrebbe una videochiamata di 20 minuti giovedì per vedere i prodotti dal vivo? Mi dici tu lorario che preferisci.', 'green', ''),
  ('NM-T42', 'Grazie per aver provato il siero: come ti sei trovata dopo due settimane? La tua opinione mi aiuta a consigliarti meglio.', 'green', ''),
  ('NM-T43', 'Ti ricordo che per gli acquisti a distanza hai 14 giorni di tempo per ripensarci: trovi tutti i dettagli nei termini ufficiali che ti allego.', 'green', ''),
  ('NM-T44', 'Non ho i dati ufficiali sul piano compensi con me: te li mando appena li recupero dal catalogo, così hai le informazioni esatte.', 'green', '')
ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  expected = EXCLUDED.expected,
  expected_rule = EXCLUDED.expected_rule;
