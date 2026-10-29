import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/agentcloud_client.dart';
import '../../models/agent.dart';
import '../../models/bundle.dart';
import '../../services/cart_service.dart';
import '../../theme/theme.dart';
import '../../widgets/agent_card.dart';
import '../chat/chat_screen.dart';
import 'agent_detail_screen.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});
  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  String _query = '';
  String _category = 'Tutti';
  // Controller della ricerca: una sola istanza, il listener aggiorna la
  // query e il filtro della griglia mentre si scrive (il controller vive
  // anche dentro RawAutocomplete).
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  // Agenti posseduti dall'utente: applica lo stesso contratto della chat
  // web (/api/user/owned); senza questa chiamata l'app mostrava "Aggiungi"
  // anche sugli agenti già abbonati.
  Set<String> _owned = const {};

  /// Solo gli agenti disponibili: le proposte non devono offrire card
  /// "prossimamente" (lato web il completamento esclude volutamente le
  /// voci non cliccabili, stessa regola qui).
  List<Agent> get _availableAgents =>
      Agent.all.where((a) => a.active).toList();

  @override
  void initState() {
    super.initState();
    _loadOwned();
    // Il testo della barra guida anche il filtro della griglia: un unico
    // listener aggiorna _query senza ricostruzioni superflue.
    _searchController.addListener(() {
      if (!mounted) return;
      final next = _searchController.text;
      if (next == _query) return;
      setState(() => _query = next);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  /// Punteggio di pertinenza delegato alla funzione condivisa del modello
  /// (`agentMatchScore`): stessa regola usata dai test.
  int _matchScore(Agent agent, String rawQuery) => agentMatchScore(agent, rawQuery);

  /// Barra di ricerca con completamento: mentre si scrive (≥2 caratteri)
  /// propone sotto il campo gli agenti disponibili più pertinenti e
  /// selezionare una voce apre direttamente la scheda agente, come nella
  /// barra web. La griglia continua a filtrare alla battitura (listener
  /// sul controller, cfr. initState).
  Widget _buildSearchField() {
    // La larghezza dell'overlay segue lo schermo meno il padding della
    // pagina: il campo occupa tutta la larghezza utile.
    final overlayWidth = MediaQuery.of(context).size.width - 32;
    return RawAutocomplete<Agent>(
      textEditingController: _searchController,
      focusNode: _searchFocus,
      displayStringForOption: (agent) => agent.name,
      optionsBuilder: (TextEditingValue value) {
        final query = value.text.trim();
        // Come sul web: sotto 2 caratteri nessuna proposta.
        if (query.length < 2) return const <Agent>[];
        final scored = _availableAgents
            .map((agent) => MapEntry<Agent, int>(agent, _matchScore(agent, query)))
            .where((entry) => entry.value > 0)
            .toList()
          ..sort((a, b) => b.value.compareTo(a.value));
        // Max 5 voci: più diventa rumore su uno schermo tascabile.
        return [for (final entry in scored.take(5)) entry.key];
      },
      onSelected: (agent) {
        // Chose una voce = navigare, non solo completare: la scheda è il
        // posto dove si decide se installare l'agente.
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => AgentDetailScreen(agent: agent)),
        );
      },
      fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
        return TextField(
          controller: controller,
          focusNode: focusNode,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => onFieldSubmitted(),
          decoration: InputDecoration(
            hintText: 'Cerca agenti per nome o funzionalità...',
            hintStyle: const TextStyle(color: AgentCloudTheme.textMuted),
            prefixIcon: const Icon(Icons.search, color: AgentCloudTheme.textMuted),
            suffixIcon: _query.isEmpty
                ? const Icon(null)
                : IconButton(
                    icon: const Icon(Icons.clear, size: 18, color: AgentCloudTheme.textMuted),
                    tooltip: 'Cancella',
                    onPressed: () {
                      // controller.clear() aggiorna _query via listener.
                      controller.clear();
                    },
                  ),
            filled: true,
            fillColor: AgentCloudTheme.surfaceCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AgentCloudTheme.primary)),
          ),
        );
      },
      optionsViewBuilder: (context, onSelected, options) {
        return Align(
          alignment: Alignment.topLeft,
          // Material al posto di un Container decorato: il drawer delle
          // proposte dipinge il fondo e l'ink splash dei ListTile, che su un
          // DecoratedBox sarebbero invisibili (asserzione di debug Flutter).
          child: Material(
            color: AgentCloudTheme.surfaceCard,
            clipBehavior: Clip.antiAlias,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: AgentCloudTheme.surfaceBorder),
            ),
            elevation: 8,
            shadowColor: const Color(0x80000000),
            child: SizedBox(
              width: overlayWidth,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 4),
                shrinkWrap: true,
                itemCount: options.length,
                itemBuilder: (context, index) {
                  final agent = options.elementAt(index);
                  return ListTile(
                    dense: true,
                    leading: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: agent.accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(agent.icon, size: 18, color: agent.accent),
                    ),
                    title: Text(
                      agent.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      agent.displayPrice,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 11),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: AgentCloudTheme.textMuted),
                    onTap: () => onSelected(agent),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _loadOwned() async {
    final owned = await AgentCloudClient().fetchOwnedAgents();
    if (!mounted) return;
    setState(() => _owned = owned.toSet());
  }

  List<String> get categories => ['Tutti', ...Agent.all.map((a) => a.category).toSet()];

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartService>();
    final filtered = Agent.all.where((a) {
      final q = _query.toLowerCase();
      final matchQ = q.isEmpty || a.name.toLowerCase().contains(q) || a.description.toLowerCase().contains(q);
      final matchC = _category == 'Tutti' || a.category == _category;
      return matchQ && matchC;
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Marketplace')),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSearchField(),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: categories.map((c) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(c, style: const TextStyle(fontSize: 12)),
                          selected: _category == c,
                          onSelected: (_) => setState(() => _category = c),
                          selectedColor: AgentCloudTheme.primary.withValues(alpha: 0.3),
                        ),
                      )).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Bundle & Risparmia', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 140,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: Bundle.all.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (_, i) {
                        final b = Bundle.all[i];
                        return Container(
                          width: 260,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(color: AgentCloudTheme.surfaceCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AgentCloudTheme.surfaceBorder)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(b.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              Text(b.description, style: const TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 12)),
                              const Spacer(),
                              Text('Da €${(b.monthlyCents/100).toStringAsFixed(2)}/mo', style: const TextStyle(color: AgentCloudTheme.primaryLight, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            sliver: SliverList.separated(
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) {
                final agent = filtered[i];
                return InkWell(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => AgentDetailScreen(agent: agent))),
                  child: AgentCard(
                    agent: agent,
                    inCart: cart.contains(agent.slug),
                    owned: _owned.contains(agent.slug),
                    onAddToCart: () => cart.add(agent.slug),
                    // pushNamed senza onGenerateRoute falliva: si apre
                    // direttamente la ChatScreen con lo slug dell'agente.
                    onOpenChat: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => ChatScreen(agentSlug: agent.slug)),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
