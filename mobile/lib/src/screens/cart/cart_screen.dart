import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/cart_service.dart';
import '../../theme/theme.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_config.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartService>();
    return Scaffold(
      appBar: AppBar(title: const Text('Carrello')),
      body: cart.isEmpty
          ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.shopping_cart_outlined, size: 48, color: AgentCloudTheme.textMuted), SizedBox(height: 12), Text('Carrello vuoto', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), Text('Aggiungi agenti dal marketplace', style: TextStyle(color: AgentCloudTheme.textMuted))]))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ...cart.items.map((it) => Card(
                  child: ListTile(
                    leading: Icon(it.agent?.icon ?? Icons.smart_toy, color: it.agent?.accent),
                    title: Text(it.agent?.name ?? it.agentSlug, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    subtitle: Text(it.agent?.displayPrice ?? '', style: const TextStyle(color: AgentCloudTheme.textMuted)),
                    trailing: IconButton(icon: const Icon(Icons.delete_outline, color: Colors.redAccent), onPressed: () => cart.remove(it.agentSlug)),
                  ),
                )),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AgentCloudTheme.surfaceCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AgentCloudTheme.surfaceBorder)),
                  child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Totale', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)), Text(cart.totalDisplay, style: const TextStyle(color: AgentCloudTheme.primaryLight, fontWeight: FontWeight.w800, fontSize: 16))]),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final url = Uri.parse('${AppConfig.siteUrl}/cart');
                      if (await canLaunchUrl(url)) await launchUrl(url, mode: LaunchMode.externalApplication);
                    },
                    icon: const Icon(Icons.lock),
                    label: const Text('Checkout sicuro su web (Stripe + PayPal)'),
                    style: ElevatedButton.styleFrom(backgroundColor: AgentCloudTheme.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(onPressed: cart.clear, child: const Text('Svuota carrello', style: TextStyle(color: Colors.redAccent))),
              ],
            ),
    );
  }
}
