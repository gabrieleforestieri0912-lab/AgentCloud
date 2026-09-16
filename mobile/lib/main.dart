import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'src/theme/theme.dart';
import 'src/config/app_config.dart';
import 'src/services/auth_service.dart';
import 'src/services/cart_service.dart';
import 'src/providers/auth_provider.dart';
import 'src/screens/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Supabase init — usa le stesse credenziali del web (.env)
  try {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: true),
    );
  } catch (_) {
    // In caso di hot restart già inizializzato
  }
  runApp(const AgentCloudApp());
}

class AgentCloudApp extends StatelessWidget {
  const AgentCloudApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CartService()),
        ChangeNotifierProvider(create: (_) => AuthProvider(AuthService())),
      ],
      child: MaterialApp(
        title: 'AgentCloud Mobile',
        debugShowCheckedModeBanner: false,
        theme: AgentCloudTheme.darkTheme,
        themeMode: ThemeMode.dark,
        home: const SplashScreen(),
      ),
    );
  }
}
