---
skill: investment-filters
description: 3-question adversarial pre-commitment filter to kill bad project ideas before wasting time/money. Use BEFORE starting any project >$5k or >40 hours.
triggers:
  - "should I build"
  - "evaluate this idea"
  - "investment filters"
  - "is this worth building"
---

# Investment Filters — 3-Question Kill Test

**Purpose:** Stop bad ideas before they waste time and capital. AI makes it too easy to START projects - this forces you to answer the hard questions BEFORE building.

**When to use:** Any project involving >$5,000 or >40 hours of work.

---

## The 3 Questions (ALL must pass)

### Q1: WHO'S PAYING FOR THIS TODAY?

**What this tests:** Is the problem real? Do people currently spend money/time solving it?

**Required answer:**
- Named customers who experience this problem
- Evidence they currently pay for solutions (proves willingness to pay)
- OR: Quantified pain (measurable hours-per-week or %-of-budget spent on workarounds)

**Kill conditions (any → 🔴 STOP):**
- ❌ "Nobody pays for this yet, but they will when I build it"
- ❌ "The problem exists but people just live with it" (no willingness to pay)
- ❌ "I think people would want this" (founder belief, no evidence)
- ❌ Can't name 3 people who currently experience this problem

**Pass conditions (🟢 GO):**
- ✅ Named customers with budget paying for inferior solutions today
- ✅ Existing competitors prove people pay (even if competitors are imperfect)
- ✅ Quantified pain with revealed-preference evidence (search volume, forum posts, existing workflow logs)

**Example passes:**
- Stripe (2010): Developers paying thousands for inferior payment integrations
- Your real estate investment: Rental market proves people pay for housing

**Example fails:**
- "AI-powered mineral license screening" - Nobody pays for this; existing services already exist

---

### Q2: WHAT WOULD PROVE IN 2 WEEKS I SHOULD STOP?

**What this tests:** Can you falsify this idea quickly? Is there a cheap kill test?

**Required answer:**
- Specific experiment you can run in ≤2 weeks
- Quantitative threshold that triggers STOP
- Pre-registered BEFORE seeing results (no moving goalposts)

**Kill conditions (any → 🔴 STOP):**
- ❌ "I need to build the full product to test it"
- ❌ "There's no way to test this quickly"
- ❌ Can't define what "failure" looks like
- ❌ Test requires >$10,000 or >2 weeks

**Pass conditions (🟢 GO):**
- ✅ Named experiment: "Build landing page, run $500 Google Ads, if <5% click 'Request Demo' → STOP"
- ✅ Clear kill metric: "Interview 10 target customers, if <6 say they'd pay → STOP"
- ✅ Falsifiable in 2 weeks for <$10k

**Pre-register format:**
```
Experiment: [What you'll test]
Timeline: [≤2 weeks]
Budget: [≤$10,000]
Success metric: [Quantitative threshold]
Kill condition: [If X happens → STOP immediately]
```

**Example passes:**
- Stripe: "Build simple API wrapper, email 20 developer friends, if <10 try it → STOP"
- Real estate: "Run comparable analysis, if cap rate <4% → STOP"

**Example fails:**
- "Need to scrape 200,000 mining claims to see if system works" (no cheap kill test)

---

### Q3: WHY ME, WHY NOW?

**What this tests:** Do you have an unfair advantage? Has something unlocked this opportunity?

**Required answer (need ONE):**

**Why ME (unfair advantage):**
- ✅ Proprietary access/data competitors can't replicate
- ✅ Domain expertise (10+ years in this space)
- ✅ Unique distribution channel (owned audience, insider access)
- ✅ Technical capability others lack (solved a hard problem)

**Why NOW (timing unlock):**
- ✅ Technology became available recently (cite: what changed + when)
- ✅ Regulatory change created new opportunity (cite: regulation + date)
- ✅ Market shift changed economics (cite: trend with data)
- ✅ Competitor failure created vacuum (cite: who failed + why)

**Kill conditions (any → 🔴 STOP):**
- ❌ "Nobody else thought of this" (they probably did)
- ❌ "I'll execute better" (not a structural advantage)
- ❌ "I'm passionate about this" (emotion, not advantage)
- ❌ Can't explain why this is possible NOW but wasn't 2 years ago
- ❌ Can't explain what YOU have that competitors don't

**Pass conditions (🟢 GO):**
- ✅ "I worked at Stripe, know payment systems, and developers trust me" (unfair advantage: expertise + distribution)
- ✅ "GPT-4 just made this economically viable; wasn't possible with GPT-3" (timing unlock: new tech)
- ✅ "I own the building, tenants already trust me" (unfair advantage: access + relationships)

**Example passes:**
- Stripe: Collison brothers are developers who felt the pain + knew how to build APIs
- Your property investment: You know the Israeli market, have access to deals

**Example fails:**
- "AI just makes this easier" (everyone has access to AI - not YOUR advantage)
- Lindgren-X: Competitors already exist (C.L.A.I.M.S., ClaimJumpper), no unique data access

---

## Verdict Decision Tree

```
Q1: WHO'S PAYING FOR THIS TODAY?
    ↓ 🔴 STOP → Nobody pays, no evidence of willingness to pay
    ↓ 🟢 GO → Named customers with budget

Q2: WHAT WOULD PROVE IN 2 WEEKS I SHOULD STOP?
    ↓ 🔴 STOP → No cheap kill test, need full product to validate
    ↓ 🟢 GO → Clear 2-week experiment with kill metric

Q3: WHY ME, WHY NOW?
    ↓ 🔴 STOP → No unfair advantage, no timing unlock
    ↓ 🟢 GO → Structural advantage or unlocking event

FINAL VERDICT:
- If ANY question is 🔴 → STOP (don't build)
- If ALL questions are 🟢 → RUN THE Q2 EXPERIMENT
- If Q2 experiment fails → STOP (no second chances)
- If Q2 experiment passes → Proceed to Phase 1 (budget: Q2 result × 10)
```

---

## Output Format (Decision Log Entry)

After running the 3 questions, create this log entry:

```markdown
# Investment Filter Decision — [Project Name]
**Date:** YYYY-MM-DD
**Time invested in this filter:** [X minutes]

## Q1: WHO'S PAYING FOR THIS TODAY?
**Answer:** [Named customers / evidence / quantified pain]
**Verdict:** 🟢 PASS / 🔴 FAIL
**Evidence:** [Links / sources / names]

## Q2: WHAT WOULD PROVE IN 2 WEEKS I SHOULD STOP?
**Experiment:** [What you'll test]
**Timeline:** [X days]
**Budget:** $[X]
**Success metric:** [Quantitative threshold]
**Kill condition:** [If X → STOP]
**Verdict:** 🟢 PASS / 🔴 FAIL

## Q3: WHY ME, WHY NOW?
**Unfair advantage:** [Your unique edge]
**Timing unlock:** [What changed recently]
**Verdict:** 🟢 PASS / 🔴 FAIL

---

## FINAL VERDICT: 🟢 GO / 🔴 STOP

**Decision:** [Proceed with Q2 experiment / STOP immediately]

**If GO — Next Action:**
[Run the Q2 experiment by YYYY-MM-DD]

**If STOP — Why:**
- [Fatal flaw 1]
- [Fatal flaw 2]

**Estimated cost of ignoring this advice:**
- Time wasted: [X hours]
- Capital wasted: $[X]

---

**Decision logged:** [Save this to decisions-log.md]
```

---

## Decision Log (Track Your Accuracy)

Keep a running log in `decisions-log.md`:

```markdown
| Date | Project | Q1 | Q2 | Q3 | Verdict | Actual Outcome | Was Filter Correct? |
|------|---------|----|----|----|---------|-----------------|--------------------|
| 2026-08-31 | Lindgren-X v2.0 | 🔴 | 🔴 | 🔴 | STOP | Saved $56k-$1.3M | ✅ YES |
| 2026-09-01 | [Next idea] | | | | | | |
```

**Review quarterly:** How many ideas did the filter STOP that should have been GO? (False negatives = framework is too strict)

---

## When to Override (RARELY)

Override ONLY if:
1. **Pure learning project** (not seeking commercial return)
   - Example: "I want to learn Rust" → Override Q1/Q2
2. **Explicit hobby** (not seeking ROI)
   - Example: "Building genealogy tool for my family" → Override Q1

**NEVER override for:**
- ❌ "I just really believe in this" (emotion)
- ❌ "We've already invested so much time" (sunk cost fallacy)
- ❌ "The filters are too conservative" (confirmation bias)

---

## Calibration History

**Tested on:**
- ✅ Lindgren-X v2.0 → Correctly predicted STOP (saved $56k-$1.3M)
- ✅ Stripe (hypothetical) → Would have correctly predicted GO
- ⚠️ Airbnb (hypothetical) → May have incorrectly predicted STOP (false negative)

**Known blind spots:**
- May kill paradigm-shift ideas where "Why NOW?" is subtle timing
- May kill ideas requiring regulatory battles (Uber, Airbnb)
- Optimized for capital efficiency, not asymmetric bets

**Tuning:** After 10 real decisions, review false-negative rate and adjust Q3 if killing good ideas.

---

## Example: How This Saved $1.3M (Lindgren-X)

**Q1: WHO'S PAYING FOR THIS TODAY?**
- Answer: Mining companies pay for C.L.A.I.M.S., ClaimJumpper, ClaimWatch, S&P
- Verdict: 🔴 FAIL - Competitors already exist, no evidence of gap

**Q2: WHAT WOULD PROVE IN 2 WEEKS I SHOULD STOP?**
- Answer: Would need to scrape 200,000 claims to validate MineScore algorithm
- Verdict: 🔴 FAIL - Can't test cheaply, need full system to validate

**Q3: WHY ME, WHY NOW?**
- Answer: "AI makes this easier" (but everyone has AI)
- Verdict: 🔴 FAIL - No proprietary data access, no unique advantage

**FINAL VERDICT: 🔴 STOP**

**Result:** Stopped at $0, saved $56k-$1.3M in development costs.

---

**Framework version:** 1.0 (Simple)  
**Last updated:** 2026-08-31  
**Maintained by:** Derived from Lindgren-X adversarial audit
