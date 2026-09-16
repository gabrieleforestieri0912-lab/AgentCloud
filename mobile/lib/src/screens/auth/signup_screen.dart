import 'package:flutter/material.dart';
import '../../theme/theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/app_shell.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});
  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  bool _loading = false;
  String? _error;
  final _auth = AuthService();

  Future<void> _signup() async {
    if (_email.text.trim().isEmpty || _pass.text.length < 8) {
      setState(() => _error = 'Email valida e password di almeno 8 caratteri');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await _auth.signUp(email: _email.text.trim(), password: _pass.text, fullName: _name.text.trim().isEmpty ? null : _name.text.trim());
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AppShell()));
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crea account')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Crea il tuo account', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
            const Text('Inizia ad automatizzare con AgentCloud.', style: TextStyle(color: AgentCloudTheme.textSecondary)),
            const SizedBox(height: 20),
            TextField(controller: _name, decoration: _dec('Nome (facoltativo)', 'Mario Rossi')),
            const SizedBox(height: 12),
            TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: _dec('Email', 'tu@azienda.com')),
            const SizedBox(height: 12),
            TextField(controller: _pass, obscureText: true, decoration: _dec('Password', 'Minimo 8 caratteri')),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: Colors.redAccent))),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _loading ? null : _signup,
              style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: _loading ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Crea account', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _dec(String label, String hint) => InputDecoration(
    labelText: label,
    hintText: hint,
    filled: true,
    fillColor: AgentCloudTheme.surfaceCard,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AgentCloudTheme.surfaceBorder)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AgentCloudTheme.primary)),
  );
}
