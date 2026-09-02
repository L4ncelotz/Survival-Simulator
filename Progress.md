# 4-Man Survival Simulator — Engine Spec Alignment & Progress

## 1. Engine Spec Alignment Status
All core simulation engine systems are 100% aligned with the canonical V1 specification.

### Key Implemented Rules & Invariants:
1. **Signal / Build**:
   - Single Build = +8 Signal
   - 2+ Build = +12 MAX Signal per day (1st builder = +8, 2nd builder = +4)
   - Builder discount: Wood cost 4 (discount -1 from base 5)
   - Wood downgrade: When remaining wood only supports 1 builder, 1st succeeds (+8 signal, 5 wood), 2nd fails with 0 wood spent
   - Useless extra builders (> 2 builders): 0 wood spent, 0 signal gained, daily limit message logged
   - Storm weather blocks BuildSignal completely (0 wood spent, 0 signal gained)
2. **Turn Pipeline (10 Steps)**:
   - Resource Actions (`Hunt`, `FindWater`, `GatherWood`, `Explore`, `Rest`) resolve and deposit resources into `workingResources` immediately
   - Support Actions (`Heal`, `BuildSignal`) execute against updated `workingResources` (freshly gathered wood and explore medicine are spendable on the same turn)
3. **Heal Collision**:
   - Sequential resolution guarantees only the 1st Heal on a target resolves (spends 1 medicine, revives to 30 HP or heals 40/60 HP)
   - Duplicate Heals on the same target spend energy/action but 0 additional medicine and 0 HP
4. **Condition & Thresholds**:
   - Healthy: 61–100 HP
   - Injured: 21–60 HP
   - DOWN: 1–20 HP
   - Dead: 0 HP or `downDays >= 2`
   - HP is single source of truth
5. **Consumption & Triage**:
   - Food demand: 3/player/day (Hunter ×1.25, Emergency ×1.5)
   - Water demand: 3/player/day (Emergency ×1.5)
   - Dual-Triage: Food triaged by descending `hunger`; Water triaged by descending `thirst` (tie-breaker lowest HP, then player ID)
   - Partial rations supported continuously: `hungerDelta = -30 * rationRatio + 25 * (1 - rationRatio)`
   - Need dynamics: +25 gain when unfed/unhydrated, -30 relief when fed/hydrated
6. **Needs Damage**:
   - Hunger > 80 => -5 HP
   - Thirst > 80 => -8 HP
7. **Trait Modifiers**:
   - Hunter: Hunt food ×1.4, Food consumption ×1.25
   - Medic: Heal ×1.5 (+20 HP bonus), team injury reduction ×0.85
   - Builder: Signal Wood cost 4 (-1 discount)
   - Scout: Explore injury ×0.5, Medicine chance ×1.2
8. **Weather Modifiers**:
   - Clear: Standard
   - Rain: Hunt food ×0.7, Find Water +2 bonus, Gather Wood -2 penalty (min 1 wood)
   - Storm: Explore injury ×2.0, BuildSignal disabled
9. **Medicine Pool**:
   - Starts at 2, capped at maximum 3 units
10. **Crisis Telemetry**:
    - Telemetry/UI warning flags (`foodCrisis`, `waterCrisis`, `hpCrisis`) do NOT modify event probabilities independently
11. **Ghost Intervention**:
    - Shared 1/day across dead players
    - Fully replaces action or event outcome on the matching RNG stream
12. **Rescue Ordering**:
    - Day 20 + Signal >= 80% takes precedence as immediate Normal Rescue Win
    - Pre-Day 20 Signal 100% enters `rescue_pending`
    - Emergency Window (Day 21–23) requires 100% Signal
    - Day 23 expired = Loss

---

## 2. Verification & Test Suite Summary
- **Unit & Integration Suites**: 90 passing tests across 13 test files (`bun test`)
- **Pipeline Order Proof**: `tests/unit/pipeline-order.test.ts` (6 dedicated invariant proof tests)
- **Type Checking**: `bun run typecheck` (`tsc --noEmit`) passes with 0 errors
- **Production Build**: `bun run build` (`vite build`) succeeds in 2.5s
- **Invariant Stress Testing**: 67,069 turns across 3,000 headless games verified with 0 invariant violations
- **Determinism Check**: 100% identical outputs for repeated seeds with bots

---

## 3. Simulator Telemetry Baseline (Canonical Rules)
- **RandomBot (1,000 games)**: Win Rate: 1.60%, Avg End Day: 22.94, Avg Signal: 53.7%
- **GreedyBot (1,000 games)**: Win Rate: 0.00%, Avg End Day: 23.00, Avg Signal: 22.9% (Over-hunts food, under-builds signal)
- **PlannerBot (1,000 games)**: Win Rate: 62.40%, Avg End Day: 21.13, Avg Signal: 84.1%
