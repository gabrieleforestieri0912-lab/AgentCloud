import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'auth/login_screen.dart';
import '../widgets/app_shell.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _decide();
  }

  Future<void> _decide() async {
    await Future.delayed(const Duration(milliseconds: 800));
    final auth = AuthService();
    final token = await auth.getStoredToken();
    // Mobile: niente waitlist. Stesso DB del web (Supabase). Se token presente → AppShell, altrimenti Login.
    if (!mounted) return;
    if (token != null) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AppShell()));
    } else {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFF6366F1).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.auto_awesome, size: 32, color: Color(0xFF818CF8)),
            ),
            const SizedBox(height: 16),
            const Text('AgentCloud', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Agenti AI autonomi', style: TextStyle(color: Color(0xFF9CA3AF))),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: Color(0xFF6366F1)),
          ],
        ),
      ),
    );
  }
}
