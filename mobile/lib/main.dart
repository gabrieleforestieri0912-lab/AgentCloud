import 'package:flutter/material.dart';

import 'src/theme/theme.dart';
import 'src/screens/dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AgentCloudApp());
}

class AgentCloudApp extends StatelessWidget {
  const AgentCloudApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgentCloud Mobile',
      debugShowCheckedModeBanner: false,
      theme: AgentCloudTheme.darkTheme,
      home: const DashboardScreen(),
    );
  }
}
