import 'dart:async';
import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../theme/theme.dart';

class CountdownTimerWidget extends StatefulWidget {
  const CountdownTimerWidget({super.key});
  @override
  State<CountdownTimerWidget> createState() => _CountdownTimerWidgetState();
}

class _CountdownTimerWidgetState extends State<CountdownTimerWidget> {
  late Timer _timer;
  Duration _left = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final diff = AppConfig.launchDate.difference(DateTime.now());
    setState(() => _left = diff.isNegative ? Duration.zero : diff);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final days = _left.inDays;
    final hours = _left.inHours % 24;
    final minutes = _left.inMinutes % 60;
    final seconds = _left.inSeconds % 60;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AgentCloudTheme.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AgentCloudTheme.surfaceBorder),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 8, height: 8, decoration: const BoxDecoration(color: AgentCloudTheme.primary, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              const Text('LANCIO 1 OTTOBRE 2026', style: TextStyle(color: AgentCloudTheme.primaryLight, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _cell(days, 'Giorni'),
              _sep(),
              _cell(hours, 'Ore'),
              _sep(),
              _cell(minutes, 'Minuti'),
              _sep(),
              _cell(seconds, 'Secondi', accent: true),
            ],
          )
        ],
      ),
    );
  }

  Widget _cell(int v, String label, {bool accent = false}) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AgentCloudTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: accent ? AgentCloudTheme.primary : AgentCloudTheme.surfaceBorder),
          ),
          child: Text(v.toString().padLeft(2, '0'), style: TextStyle(color: accent ? AgentCloudTheme.primaryLight : Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: AgentCloudTheme.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _sep() => const Padding(padding: EdgeInsets.symmetric(horizontal: 6), child: Text(':', style: TextStyle(color: AgentCloudTheme.primary, fontWeight: FontWeight.bold)));
}
