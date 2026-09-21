// ignore_for_file: prefer_const_constructors

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/cart_service.dart';
import '../screens/dashboard_screen.dart';
import '../screens/marketplace/marketplace_screen.dart';
import '../screens/chat/chat_list_screen.dart';
import '../screens/integrations/integrations_screen.dart';
import '../screens/account/account_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../theme/theme.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _idx = 0;
  final _pages = const [
    DashboardScreen(),
    MarketplaceScreen(),
    ChatListScreen(),
    IntegrationsScreen(),
    AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_idx],
      bottomNavigationBar: NavigationBar(
        backgroundColor: AgentCloudTheme.surface,
        indicatorColor: AgentCloudTheme.primary.withValues(alpha: 0.2),
        selectedIndex: _idx,
        onDestinationSelected: (i) => setState(() => _idx = i),
        destinations: [
          NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Dashboard'),
          NavigationDestination(
              icon: Icon(Icons.store_outlined),
              selectedIcon: Icon(Icons.store),
              label: 'Marketplace'),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          NavigationDestination(
              icon: Icon(Icons.hub_outlined),
              selectedIcon: Icon(Icons.hub),
              label: 'Integrazioni'),
          NavigationDestination(
            icon: Consumer<CartService>(
                builder: (_, cart, __) => Badge(
                    label: Text('${cart.count}'),
                    isLabelVisible: cart.count > 0,
                    child: const Icon(Icons.person_outline))),
            selectedIcon: Consumer<CartService>(
                builder: (_, cart, __) => Badge(
                    label: Text('${cart.count}'),
                    isLabelVisible: cart.count > 0,
                    child: const Icon(Icons.person))),
            label: 'Account',
          ),
        ],
      ),
      floatingActionButton: _idx == 1
          ? Consumer<CartService>(
              builder: (_, cart, __) => cart.isEmpty
                  ? const SizedBox.shrink()
                  : FloatingActionButton.extended(
                      backgroundColor: AgentCloudTheme.primary,
                      foregroundColor: Colors.white,
                      onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const CartScreen())),
                      icon: const Icon(Icons.shopping_cart),
                      label: Text('${cart.count} • ${cart.totalDisplay}'),
                    ),
            )
          : null,
    );
  }
}
