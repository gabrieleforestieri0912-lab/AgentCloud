import 'package:flutter/material.dart';
import '../../theme/theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/app_shell.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _pass = TextEditingController();
  bool _loading = false;
  String? _error;
  final _auth = AuthService();

  Future<void> _login() async {
    if (_email.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Compila email e password');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await _auth.signIn(email: _email.text.trim(), password: _pass.text);
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
      appBar: AppBar(title: const Text('Accedi')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 12),
            const Text('Bentornato', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
            const Text('Accedi per gestire i tuoi agenti.', style: TextStyle(color: AgentCloudTheme.textSecondary)),
            const SizedBox(height: 24),
            TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: _dec('Email', 'tu@azienda.com')),
            const SizedBox(height: 12),
            TextField(controller: _pass, obscureText: true, decoration: _dec('Password', 'Minimo 8 caratteri')),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: Colors.redAccent))),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _loading ? null : _login,
              style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: _loading ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Accedi', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () async {
                try { await _auth.signInWithGoogle(); } catch (e) { setState(() => _error = e.toString()); }
              },
              icon: const Icon(Icons.login, size: 18),
              label: const Text('Continua con Google'),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: AgentCloudTheme.surfaceBorder), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Non hai account? ', style: TextStyle(color: AgentCloudTheme.textMuted)),
                GestureDetector(onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SignupScreen())), child: const Text('Registrati', style: TextStyle(color: AgentCloudTheme.primaryLight, fontWeight: FontWeight.bold))),
              ],
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
