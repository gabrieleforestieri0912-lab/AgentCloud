import 'package:flutter/material.dart';
import '../../services/waitlist_service.dart';
import '../../widgets/countdown_timer.dart';
import 'welcome_name_dialog.dart';

class WaitlistScreen extends StatefulWidget {
  const WaitlistScreen({super.key});
  @override
  State<WaitlistScreen> createState() => _WaitlistScreenState();
}

class _WaitlistScreenState extends State<WaitlistScreen> {
  final _email = TextEditingController();
  final _svc = WaitlistService();
  bool _loading = false;
  String? _error;
  String? _success;
  bool _joined = false;
  int _total = 0;
  Map<String, dynamic>? _ranking;
  String? _referralLink;

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    try {
      final s = await _svc.getStatus();
      if (s['total'] is int) setState(() => _total = s['total'] as int);
      final r = await _svc.getRanking();
      if (r != null) setState(() => _ranking = r);
    } catch (_) {}
  }

  Future<void> _join() async {
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) { setState(() => _error = 'Inserisci email valida'); return; }
    setState(() { _loading = true; _error = null; _success = null; });
    try {
      final data = await _svc.join(email: email);
      setState(() { _joined = true; _success = 'Sei in lista! 🎉'; if (data['total'] is int) _total = data['total']; final code = data['referralCode'] ?? data['referral_code']; if (code != null) _referralLink = 'https://agentcloud.agency/waitlist/join?ref=$code'; });
      final nameInfo = await _svc.getName();
      final hasName = nameInfo != null && (nameInfo['full_name'] ?? nameInfo['fullName']) != null;
      if (!hasName && mounted) {
        await showDialog(context: context, barrierDismissible: false, builder: (_) => WelcomeNameDialog(email: email));
      }
      await _loadStatus();
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF0A0A0F)], begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(children: [
                  Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFF6366F1).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.auto_awesome, color: Color(0xFF818CF8), size: 20)),
                  const SizedBox(width: 10),
                  const Text('AgentCloud', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(20)), child: Text('$_total in lista', style: const TextStyle(color: Color(0xFFC7D2FE), fontSize: 12))),
                ]),
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: const Color(0xFF6366F1).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFF4338CA))),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.bolt, size: 12, color: Color(0xFF818CF8)), SizedBox(width: 6), Text('In arrivo — 1 Ottobre 2026', style: TextStyle(color: Color(0xFFA5B4FC), fontSize: 11, fontWeight: FontWeight.bold))]),
                ),
                const SizedBox(height: 16),
                const Text('Il tuo team\nche non dorme mai.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900, height: 0.95)),
                const SizedBox(height: 12),
                const Text('Crea agenti AI che rispondono su WhatsApp, Email e Shopify mentre tu dormi. Nessun codice.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14, height: 1.5)),
                const SizedBox(height: 20),
                const CountdownTimerWidget(),
                const SizedBox(height: 20),
                if (!_joined) ...[
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Inserisci la tua email',
                      hintStyle: const TextStyle(color: Color(0xFF6B7280)),
                      filled: true,
                      fillColor: const Color(0xFF1A1A24),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: Color(0xFF262635))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _loading ? null : _join,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
                    child: _loading
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Text('Entra in waitlist', style: TextStyle(fontWeight: FontWeight.bold)), SizedBox(width: 8), Icon(Icons.arrow_forward, size: 18)]),
                  ),
                  if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.redAccent, fontSize: 13))),
                  const SizedBox(height: 8),
                  const Text('Niente spam. Una sola email quando tocca a te.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF6B7280), fontSize: 11)),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF1A1A24), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFF262635))),
                    child: Column(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 32),
                        const SizedBox(height: 8),
                        const Text('Sei in lista! ✓', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        if (_success != null) Text(_success!, style: const TextStyle(color: Color(0xFF9CA3AF))),
                        if (_referralLink != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: const Color(0xFF13131A), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF262635))),
                            child: Row(children: [Expanded(child: Text(_referralLink!, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12))), const Icon(Icons.copy, size: 16, color: Color(0xFF9CA3AF))]),
                          ),
                        ],
                        if (_ranking != null) ...[
                          const SizedBox(height: 12),
                          Text('Posizione #${_ranking!['position']} su ${_ranking!['total']} • ${_ranking!['points'] ?? 0} punti', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
