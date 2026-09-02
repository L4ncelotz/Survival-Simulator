# 4-Man Survival Simulator — Implementation Plan

## Goal

สร้างเกม Survival สำหรับผู้เล่น 4 คน โดยแยก **Game Engine ออกจาก UI** อย่างชัดเจน

เป้าหมายแรกไม่ใช่ทำหน้าเว็บให้สวย แต่ทำให้เกมสามารถ:

- เริ่มเกมจาก Seed เดิมแล้วได้ผลเดิม
- เล่นตั้งแต่ Day 1 จน Win / Lose ได้
- Resolve Action ตามกฎทั้งหมดได้ถูกต้อง
- Run แบบไม่มี UI ได้
- Run simulation หลายพันเกมเพื่อ Balance ได้

---

# Phase 1 — Foundation

สร้างโครงสร้างพื้นฐานของเกมก่อน

สิ่งที่จะทำ:

- Define `GameState`
- Define Player / Action / Resource / Weather / Trait types
- Load balance config
- สร้าง helper สำหรับ HP Condition
- สร้าง Seeded RNG แบบหลาย stream

ผลลัพธ์ที่ต้องได้:

> Seed เดิมต้องสร้างเกมเริ่มต้นเหมือนเดิมทุกครั้ง

---

# Phase 2 — Game Creation

สร้างระบบเริ่มเกม

สิ่งที่จะทำ:

- สร้างผู้เล่น 4 คน
- Shuffle Trait โดยไม่ซ้ำกัน
- ตั้ง Starting Resources
- ตั้ง Player Stats
- Roll Weather ของ Day 1
- Initialize Signal / Phase / Crisis / RNG

ผลลัพธ์:

```text
createGame(seed)
→ Ready-to-play GameState
```

---

# Phase 3 — Core Actions

ทำ Action พื้นฐานก่อน

เริ่มจาก:

- Hunt
- Find Water
- Gather Wood
- Explore
- Rest

ระบบจะรับผิดชอบ:

- Energy cost
- Trait modifier
- Weather modifier
- Injury roll
- Resource reward

ยังไม่ทำ Heal และ Build Signal ในช่วงแรก เพราะสองระบบนี้มี collision rules เพิ่มเติม

---

# Phase 4 — Support Actions

เพิ่ม Action ที่มี interaction ระหว่างผู้เล่น

## Heal

รองรับ:

- เลือก target
- Medicine usage
- DOWN recovery
- Medic bonus
- Heal target ซ้ำในวันเดียวกัน

## Build Signal

รองรับ:

- Single build
- Double build
- Builder discount
- Wood downgrade
- Storm block
- Daily Signal limit

---

# Phase 5 — Survival Systems

สร้างระบบที่ทำให้ทรัพยากรเชื่อมกับผู้เล่น

Flow:

```text
Food / Water Pool
        ↓
Automatic Triage
        ↓
Hunger / Thirst
        ↓
HP Damage
        ↓
Healthy / Injured / DOWN / Dead
```

ระบบนี้จะดูแล:

- Daily consumption
- Hunter consumption modifier
- Emergency Window ×1.5
- Hunger / Thirst progression
- HP damage
- DOWN timer
- Death

HP เป็น source of truth ของ Condition ตาม design ปัจจุบัน

---

# Phase 6 — Event System

เพิ่มเหตุการณ์ประจำวัน

ประกอบด้วย:

- Positive Event
- Neutral Event
- Negative Event
- Pity weighting
- Crisis telemetry

Event ทุกอันต้องใช้ Seeded RNG เพื่อให้ replay ได้

---

# Phase 7 — Ghost Intervention

เพิ่มระบบสำหรับผู้เล่นที่ตายแล้ว

รองรับ:

- Action result reroll
- Event reroll
- Shared 1 intervention / day
- ต้องยอมรับผล reroll ใหม่

Reroll ต้องใช้ RNG stream เดิม ไม่สร้าง RNG ใหม่

---

# Phase 8 — Day Resolver

นำระบบทั้งหมดมาประกอบเป็น `resolveDay()`

ลำดับหลัก:

```text
Validate Actions
↓
Reveal Actions
↓
Resource Actions
↓
Support Actions
↓
Random Event
↓
Consumption
↓
Needs Damage
↓
DOWN / Death
↓
Crisis Check
↓
Win / Lose
↓
Roll Next Weather
```

`resolveDay()` ต้องเป็น pure function และไม่ mutate state เดิม ตาม signature ที่กำหนดไว้

---

# Phase 9 — Win / Lose System

รองรับเส้นทางจบเกมทั้งหมด

## Normal Rescue

```text
Day 20
Signal >= 80%
→ Win
```

## Early Rescue

```text
Signal >= 100%
→ Rescue Pending
→ Survive one final day
→ Win
```

## Emergency Window

```text
Day 21–23
Consumption ×1.5

Signal 100%
→ Rescue
```

ถ้าจบ Day 23 แล้วยังไม่ผ่านเงื่อนไข → Lose

ค่า Timeline ปัจจุบันกำหนด Rescue Day 20 และ Emergency Window ถึง Day 23

---

# Phase 10 — Headless Game

ก่อนทำ UI ต้องสามารถเล่นเกมโดยไม่เปิด Browser ได้

ตัวอย่างแนวคิด:

```text
Create Game
↓
Submit Actions
↓
Resolve Day
↓
Print State
↓
Repeat
```

เป้าหมาย:

> เล่นเกมครบตั้งแต่ Day 1 จนจบได้จาก Engine อย่างเดียว

---

# Phase 11 — Bots

สร้าง bot เพื่อใช้ทดสอบเกม

## Random Bot

เลือก Action แบบสุ่ม

ใช้สำหรับหา:

- Crash
- Invalid state
- Edge cases

## Greedy Bot

แก้ปัญหาที่เร่งด่วนที่สุดก่อน

ใช้เป็นตัวแทนผู้เล่นมือใหม่

## Planner Bot

วางแผนทั้ง Survival และ Signal deadline

ใช้ตรวจว่า Strategy ที่ดีที่สุดแรงเกินไปหรือไม่

---

# Phase 12 — Simulator

สร้างระบบเล่นเกมอัตโนมัติจำนวนมาก

```text
100 games
→ Debug

1,000 games
→ Sanity Check

10,000 games
→ Balance
```

เก็บ Metrics เช่น:

- Win Rate
- Average End Day
- Rescue Day
- Crisis Rate
- Early Death Rate
- Energy Block Rate
- Action Usage
- Opportunity Usage
- DOWN Recovery Rate
- Medicine Starvation
- Ending Resources

---

# Phase 13 — Balance

ปรับตัวเลขผ่าน Simulator เท่านั้น

หลักการ:

> เปลี่ยนหนึ่งกลุ่มตัวแปรต่อครั้ง

โดยเฉพาะ `Gather Wood` ต้องปรับเป็นตัวท้าย ๆ เพราะมีผลโดยตรงกับความเร็วของ Signal economy

ไม่ควร Balance จากความรู้สึกอย่างเดียว

---

# Phase 14 — Web UI

หลัง Engine และ Balance ใช้งานได้แล้วจึงเริ่มหน้าเว็บ

หน้าหลัก:

```text
Lobby
↓
Game
↓
Action Selection
↓
Everyone Ready
↓
Reveal
↓
Day Result
↓
Next Day
↓
Win / Lose
```

UI V1 ใช้:

- Text
- Cards
- Progress bars
- Icons
- Simple transitions

ไม่ต้องใช้ custom assets

---

# Development Rule

ระหว่างทำ V1:

**ห้ามเพิ่ม mechanic ใหม่จน Engine เล่นจบเกมได้**

สิ่งที่ไม่อยู่ใน V1:

- Crafting Tree
- Map Exploration
- Combat System
- Individual Inventory
- Skill Tree
- WebSocket Multiplayer
- Complex Animation

เป้าหมายคือ:

> ทำ Core Game ให้สนุกและ Balance ก่อน แล้วค่อยขยาย