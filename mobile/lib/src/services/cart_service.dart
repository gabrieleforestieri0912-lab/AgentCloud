import 'package:flutter/foundation.dart';
import '../models/cart.dart';

class CartService extends ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);
  int get count => _items.length;
  int get totalCents => _items.fold(0, (sum, it) => sum + it.priceCents);
  String get totalDisplay => '€${(totalCents / 100).toStringAsFixed(2)}';
  bool get isEmpty => _items.isEmpty;

  void add(String slug) {
    if (_items.any((it) => it.agentSlug == slug)) return;
    _items.add(CartItem(agentSlug: slug));
    notifyListeners();
  }

  void remove(String slug) {
    _items.removeWhere((it) => it.agentSlug == slug);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  bool contains(String slug) => _items.any((it) => it.agentSlug == slug);
}
