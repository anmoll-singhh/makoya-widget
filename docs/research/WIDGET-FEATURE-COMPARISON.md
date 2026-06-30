# Makoya Widget — Feature Comparison vs. Competitors

**Prepared:** 2026-06-30
**Scope:** Every end-user feature in the Makoya accessibility widget — both what is **live in production today** and what is **being built now** on the `feat/widget-accessibe-parity` branch — set side-by-side against the four leading accessibility-overlay vendors: **accessiBe**, **UserWay**, **AudioEye**, and **EqualWeb**.

---

## 1. Executive summary

- After the in-flight **accessiBe-parity build** lands, the Makoya widget exposes **35 user-facing tools**, **12 one-click profiles**, and **4 UI languages** (en / es / fr / de).
- On the *visible tool menu*, Makoya reaches **full accessiBe parity** and goes **beyond it** on profiles (12 vs 6) and on several toggles (bigger tap targets, page zoom, voice navigation + virtual keyboard together, AI text-simplify).
- The competitors' remaining differentiation is **not** in the panel — it is the background **"AI automatic remediation / screen-reader optimization"** layer plus **legal compliance guarantees**. Makoya **deliberately does not build these** (architectural invariant: never rewrite the host DOM; compliance-copy guardrail). This is the exact behaviour that produced lawsuits and disability-community backlash against the overlays.
- The one honest, closable gap is **UI language coverage** (4 vs 12–50+). It is translation work, not engineering.

---

## 2. Build status legend

| Mark | Meaning |
|---|---|
| 🟢 **LIVE** | Shipped and running in production today (the 18-feature bundle). |
| 🔨 **IN BUILD** | Being built now on `feat/widget-accessibe-parity` (target state: 35 features). |
| ✅ | Competitor has the feature |
| ⚠️ | Competitor has a partial / weaker version |
| ❌ | Competitor does not have it |
| 🚫 | **Deliberately excluded by Makoya** (by design — see §5) |

---

## 3. Makoya's complete feature set (post-parity)

### Content adjustments (10)
| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Page zoom (whole-page 70–150%) | 🔨 IN BUILD | `zoom` on body; reflows, unlike transform-scale |
| 2 | Text size (80–200% stepper) | 🟢 LIVE → 🔨 upgraded to % stepper | Root font-size scaling (rem/em safe) |
| 3 | Line spacing (100–250%) | 🟢 LIVE → 🔨 % stepper | |
| 4 | Letter spacing (0–0.5em) | 🔨 IN BUILD | New continuous control |
| 5 | Readable / dyslexia font | 🟢 LIVE → 🔨 segmented (off/readable/dyslexic) | OpenDyslexic embed in parallel branch |
| 6 | Text alignment (L/C/R/justify) | 🟢 LIVE → 🔨 5-button segment | |
| 7 | Highlight titles | 🟢 LIVE | Yellow chip on headings |
| 8 | Highlight links | 🟢 LIVE | Underline + outline |
| 9 | Hide images | 🟢 LIVE | Reduces distraction |
| 10 | Stop animations | 🟢 LIVE | Pauses motion/autoplay |

### Color / display (6)
| # | Feature | Status | Notes |
|---|---|---|---|
| 11 | Contrast modes (on/light/dark/high) | 🟢 LIVE (on/dark) → 🔨 add light + high | Composed body-filter seam |
| 12 | Saturation (grayscale/low/high) | 🟢 LIVE | |
| 13 | Text color override | 🔨 IN BUILD | Curated swatch palette |
| 14 | Title color override | 🔨 IN BUILD | Curated swatch palette |
| 15 | Background color override | 🔨 IN BUILD | Curated swatch palette |
| 16 | Reading mask | 🟢 LIVE | Dims page around a focus band |

### Orientation / navigation (12)
| # | Feature | Status | Notes |
|---|---|---|---|
| 17 | Reading ruler | 🟢 LIVE | Guide line follows cursor |
| 18 | Big cursor (black / white) | 🟢 LIVE | |
| 19 | Highlight on hover | 🟢 LIVE | Outlines element under pointer |
| 20 | Bigger tap targets | 🟢 LIVE | ≥44px hit areas (**beyond accessiBe**) |
| 21 | Enhanced focus ring | 🟢 LIVE | Bold amber `:focus-visible` ring |
| 22 | Text magnifier lens | 🔨 IN BUILD | Pointer-driven overlay |
| 23 | Reading mode (article view) | 🔨 IN BUILD | Distraction-free Shadow-DOM pane, focus-trapped |
| 24 | Useful links menu | 🔨 IN BUILD | Jump menu of page links |
| 25 | Page structure menu | 🔨 IN BUILD | Headings / landmarks jump menu |
| 26 | Keyboard navigation shortcuts | 🔨 IN BUILD | Modifier-gated (Alt+M/H/F/B/G) |
| 27 | Virtual keyboard | 🔨 IN BUILD | On-screen keyboard (UserWay parity) |
| 28 | Voice navigation | 🔨 IN BUILD | SpeechRecognition commands (UserWay parity) |

### Audio (2)
| # | Feature | Status | Notes |
|---|---|---|---|
| 29 | Mute sounds | 🟢 LIVE | |
| 30 | Read aloud (TTS) | 🟢 LIVE | Click-to-speak |

### Chrome / tools (5)
| # | Feature | Status | Notes |
|---|---|---|---|
| 31 | Dictionary lookup | 🔨 IN BUILD | `dictionaryapi.dev`, client-side, fail-silent |
| 32 | Feedback form | 🔨 IN BUILD | `POST /api/widget-feedback` → owner email |
| 33 | Hide interface (session) | 🟢 LIVE | Restores next page-load |
| 34 | In-panel user guide | 🔨 IN BUILD | "Help" (compliance-safe naming) |
| 35 | AI text simplify | 🔨 IN BUILD (ships OFF) | Per-site flag, Claude Haiku, never rewrites host DOM |

### One-click profiles (12 — accessiBe has 6)
Vision impaired · Low vision · Dyslexia · ADHD / Focus · Seizure safe · Senior · Cognitive · Color blind · Motor / tremor · ESL / Easy reading · Keyboard navigation · Clear reading

### Languages (4)
English · Spanish · French · German

---

## 4. Head-to-head comparison matrix

| Feature | Makoya | accessiBe | UserWay | AudioEye | EqualWeb |
|---|:--:|:--:|:--:|:--:|:--:|
| **— Content —** | | | | | |
| Page zoom (whole page) | 🔨 | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Text size scaling | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Line spacing | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Letter spacing | 🔨 | ✅ | ✅ | ✅ | ✅ |
| Readable / dyslexia font | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Text alignment | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Highlight titles | 🟢 | ✅ | ⚠️ | ✅ | ✅ |
| Highlight links | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Hide images | 🟢 | ✅ | ✅ | ⚠️ | ✅ |
| Stop animations | 🟢 | ✅ | ✅ | ✅ | ✅ |
| **— Color / Display —** | | | | | |
| Contrast (dark/light/high) | 🟢/🔨 | ✅ | ✅ | ✅ | ✅ |
| Saturation (mono/low/high) | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Text color override | 🔨 | ✅ | ⚠️ | ⚠️ | ✅ |
| Title color override | 🔨 | ✅ | ❌ | ⚠️ | ✅ |
| Background color override | 🔨 | ✅ | ⚠️ | ⚠️ | ✅ |
| Reading mask | 🟢 | ✅ | ✅ | ✅ | ✅ |
| **— Navigation / Motor —** | | | | | |
| Reading ruler / guide | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Big cursor (B/W) | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Highlight on hover | 🟢 | ✅ | ⚠️ | ✅ | ✅ |
| Bigger tap targets | 🟢 | ❌ | ❌ | ❌ | ⚠️ |
| Enhanced focus ring | 🟢 | ✅ | ✅ | ✅ | ✅ |
| Text magnifier lens | 🔨 | ✅ | ⚠️ | ⚠️ | ✅ |
| Reading mode (article view) | 🔨 | ✅ | ⚠️ | ⚠️ | ✅ |
| Useful links menu | 🔨 | ✅ | ⚠️ | ⚠️ | ✅ |
| Page structure / landmarks | 🔨 | ⚠️ | ✅ | ✅ | ✅ |
| Keyboard navigation shortcuts | 🔨 | ✅ | ✅ | ✅ | ✅ |
| Virtual keyboard | 🔨 | ✅ | ❌ | ❌ | ⚠️ |
| Voice navigation | 🔨 | ❌ | ✅ | ⚠️ | ❌ |
| **— Audio —** | | | | | |
| Mute sounds | 🟢 | ✅ | ⚠️ | ⚠️ | ✅ |
| Read aloud / TTS | 🟢 | ⚠️ | ✅ | ✅ | ✅ |
| **— Tools / Chrome —** | | | | | |
| Dictionary lookup | 🔨 | ✅ | ✅ | ⚠️ | ✅ |
| Feedback form | 🔨 | ✅ | ✅ | ✅ | ✅ |
| Hide interface (session) | 🟢 | ✅ | ✅ | ✅ | ✅ |
| In-panel user guide / help | 🔨 | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| AI text simplify | 🔨 | ❌ | ⚠️ | ❌ | ❌ |
| **— Presets / Locale —** | | | | | |
| One-click profiles | **12** | 6 | ~4 | ⚠️ | ~6 |
| UI languages | **4** | 12+ | 50+ | many | many |

---

## 5. Features competitors have that Makoya does NOT

These are the only meaningful gaps. The first two are **deliberate refusals**, not missing work.

### 5.1 Deliberately excluded (by design) 🚫
1. **AI "automatic remediation" / screen-reader optimization.** accessiBe, UserWay, and AudioEye inject ARIA roles, auto-generate alt-text, and rewrite the page DOM in the background to claim screen-reader support. **Makoya refuses this** — its core invariant is *effects via CSS attributes + one stylesheet, never DOM rewriting, never fighting the user's assistive tech.* This refusal is the heart of Makoya's positioning: it is precisely the behaviour that triggered ADA lawsuits and a [public statement against overlays signed by accessibility advocates].
2. **"WCAG/ADA compliant in 48 hours" guarantees.** Competitors lead with legal-compliance claims. Makoya's compliance guardrail forbids this copy — the widget offers accessibility *preferences/tools*, never a compliance guarantee. A go-to-market choice, not a missing feature.

### 5.2 Genuine, closable gaps
3. **UI language coverage** — competitors localize the *panel UI* into 12–50+ languages; Makoya ships 4. This is translation-string work (`i18n.ts`), not engineering; the type system already supports adding languages.
4. **Managed / human remediation services** (AudioEye, EqualWeb) — human audits + remediation sold as a service. A services business line, adjacent to (not part of) the widget. Makoya's scanner is the comparable asset.
5. **Vendor scale extras** — usage-analytics dashboards, automated accessibility-statement generators, litigation-support/monitoring. Makoya has some adjacent (scanner, statement generator in v3.1 backend); others are unbuilt.

---

## 6. Features Makoya has that competitors do NOT (or do worse)

1. **Bigger tap targets** — ≥44px motor-friendly hit areas; absent from accessiBe and UserWay.
2. **12 one-click profiles vs accessiBe's 6** — adds Color-blind, Motor/tremor, ESL, Cognitive, Clear-reading on top of full parity.
3. **Voice navigation + virtual keyboard together** — UserWay has voice; accessiBe has neither voice nav nor the combo.
4. **AI text simplification** — genuinely rare among overlays; ships OFF behind a per-site plan flag.
5. **Whole-page zoom** (true reflow) rather than font-scale only.
6. **A widget that is itself accessible** — real `<button>`s, `aria-pressed`, Esc-to-close, focus management, Shadow-DOM isolation, and prefs that persist across SPA navigation. Competitor overlays are frequently criticized for failing exactly here.
7. **Fail-open architecture** — every network/storage/permission path is guarded; the widget never throws and never blocks the host page.

---

## 7. Bottom line

| Dimension | Verdict |
|---|---|
| Visible tool menu | **Parity+** — meets accessiBe, exceeds UserWay/AudioEye defaults |
| One-click profiles | **Ahead** — 12 vs 6 |
| Unique tools | Bigger targets, page zoom, voice + virtual keyboard, AI simplify |
| Background AI remediation | **Intentionally absent** (legal/ethical stance, not a gap) |
| Compliance guarantees | **Intentionally absent** (guardrail) |
| Language coverage | **Behind** — 4 vs 12–50+ (closable: translation only) |
| Self-accessibility & safety | **Ahead** — overlays routinely fail here |

**Net:** once the parity build ships, Makoya matches or beats the competitors on everything a visitor can actually see and use, while deliberately declining the one capability (background "auto-compliance" DOM rewriting) that has made the incumbents legally and reputationally vulnerable.
