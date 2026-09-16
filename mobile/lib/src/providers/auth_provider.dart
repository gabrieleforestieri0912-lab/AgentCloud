import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _service;
  Session? _session;
  bool _loading = true;

  AuthProvider(this._service) {
    _init();
  }

  bool get loading => _loading;
  Session? get session => _session;
  User? get user => _session?.user;
  bool get isSignedIn => _session != null;

  Future<void> _init() async {
    _session = _service.session;
    _loading = false;
    notifyListeners();
    _service.authStateChanges.listen((event) {
      _session = event.session;
      notifyListeners();
    });
  }

  Future<void> signIn(String email, String password) async {
    final res = await _service.signIn(email: email, password: password);
    _session = res.session;
    notifyListeners();
  }

  Future<void> signUp(String email, String password, {String? name}) async {
    final res = await _service.signUp(email: email, password: password, fullName: name);
    _session = res.session;
    notifyListeners();
  }

  Future<void> signOut() async {
    await _service.signOut();
    _session = null;
    notifyListeners();
  }
}
