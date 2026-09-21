// ignore_for_file: deprecated_member_use

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';

class AuthService {
  static const _tokenKey = 'agentcloud_token';
  static const _emailKey = 'agentcloud_email';
  final _storage = const FlutterSecureStorage();
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<void> init() async {
    await Supabase.initialize(
        url: AppConfig.supabaseUrl, anonKey: AppConfig.supabaseAnonKey);
  }

  Session? get session => _supabase.auth.currentSession;
  User? get user => _supabase.auth.currentUser;
  bool get isSignedIn => session != null;

  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  Future<AuthResponse> signIn(
      {required String email, required String password}) async {
    final res = await _supabase.auth
        .signInWithPassword(email: email, password: password);
    if (res.session != null) {
      await _storage.write(key: _tokenKey, value: res.session!.accessToken);
      await _storage.write(key: _emailKey, value: email);
    }
    return res;
  }

  Future<AuthResponse> signUp(
      {required String email,
      required String password,
      String? fullName}) async {
    final res = await _supabase.auth.signUp(
      email: email,
      password: password,
      data: fullName != null ? {'full_name': fullName} : null,
    );
    if (res.session != null) {
      await _storage.write(key: _tokenKey, value: res.session!.accessToken);
      await _storage.write(key: _emailKey, value: email);
    }
    return res;
  }

  Future<void> signInWithGoogle() async {
    await _supabase.auth.signInWithOAuth(OAuthProvider.google,
        redirectTo: '${AppConfig.siteUrl}/auth/callback');
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _emailKey);
  }

  Future<String?> getStoredToken() => _storage.read(key: _tokenKey);
  Future<String?> getStoredEmail() => _storage.read(key: _emailKey);
}
