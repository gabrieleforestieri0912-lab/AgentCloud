import 'package:flutter/material.dart';
import '../../theme/theme.dart';
import '../../services/waitlist_service.dart';

class WelcomeNameDialog extends StatefulWidget {
  final String email;
  const WelcomeNameDialog({super.key, required this.email});
  @override
  State<WelcomeNameDialog> createState() => _WelcomeNameDialogState();
}

class _WelcomeNameDialogState extends State<WelcomeNameDialog> {
  final _name = TextEditingController();
  bool _saving = false;
  String? _error;
  bool _done = false;
  final _svc = WaitlistService();

  Future<void> _save() async {
    final v = _name.text.trim();
    if (v.isEmpty) { setState(() => _error = 'Inserisci il tuo nome.'); return; }
    setState(() { _saving = true; _error = null; });
    try {
      await _svc.saveName(name: v, email: widget.email);
      setState(() => _done = true);
      await Future.delayed(const Duration(milliseconds: 1200));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AgentCloudTheme.surfaceCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF038BFE), Color(0xFFE879A8)]), borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.auto_awesome, color: Colors.white),
          ),
          const SizedBox(height: 12),
          const Text('Benvenuto in AgentCloud! 🎉', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        ],
      ),
      content: _done
          ? Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 48),
              const SizedBox(height: 8),
              Text('Grazie${_name.text.trim().isEmpty ? '' : ', ${_name.text.trim()}'}!', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text('Perfetto! A presto — ti avviseremo al lancio.', textAlign: TextAlign.center, style: TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 13)),
            ])
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Sei ufficialmente in lista. Come ti chiami?', textAlign: TextAlign.center, style: TextStyle(color: AgentCloudTheme.textSecondary, fontSize: 13)),
                const SizedBox(height: 16),
                TextField(
                  controller: _name,
                  maxLength: 80,
                  decoration: InputDecoration(
                    hintText: 'Il tuo nome',
                    prefixIcon: const Icon(Icons.person_outline, color: AgentCloudTheme.textMuted),
                    filled: true,
                    fillColor: AgentCloudTheme.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder)),
                  ),
                ),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12))),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
                    child: _saving ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Salva e continua'),
                  ),
                ),
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Salta per ora', style: TextStyle(color: AgentCloudTheme.textMuted))),
              ],
            ),
    );
  }
}
