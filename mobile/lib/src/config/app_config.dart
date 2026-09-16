/// Config centralizzata — mirror di .env / src/lib/site-url + waitlist-constants
class AppConfig {
  static const String siteUrl = 'https://www.agentcloud.agency';
  static const String apiBaseUrl = 'https://www.agentcloud.agency';
  // Supabase — stessi valori di .env (pubblici, anon key è safe lato client)
  static const String supabaseUrl = 'https://umnvmlfzclkuorwnevpu.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnZtbGZ6Y2xrdW9yd25ldnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzgyMjksImV4cCI6MjA5NzQxNDIyOX0.Q1PWWyocWG7I3hRJRyT_hxz_uY3P6QiXmE3_zMWopJg';

  static const String launchAt = '2026-10-01T16:00:00+02:00';
  static DateTime get launchDate => DateTime.parse(launchAt);
  static bool get hasLaunched => DateTime.now().isAfter(launchDate);

  static const String supportEmail = 'support@agentcloud.agency';
  static const String instagramUrl = 'https://www.instagram.com/_agentcloud/';
  static const String extensionUrl = 'https://agentcloud.agency/install#extension';
  static const String cliDocsUrl = 'https://agentcloud.agency/docs/cli';
}
