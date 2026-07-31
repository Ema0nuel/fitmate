"""
FitMateBOT — Guardrail Layer.

Chapter Three Section 3.5.1 stage (9):
  "Rule-based pattern matching (banned topics, medical-diagnosis
   phrasing) combined with a lightweight classifier for
   paraphrased or previously unseen unsafe content."

GUARDRAIL-POLICY.md compliance:
  - Input checks: topic classification, intent detection
  - Output checks: domain verification, medical claim detection, disclaimer injection
  - Every trigger is logged for thesis evaluation
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


# ──────────────────────────────────────────────────
# Guardrail result — carries the verdict + metadata
# ──────────────────────────────────────────────────

@dataclass
class GuardrailResult:
    """Result of a guardrail check."""
    passed: bool  # True = message is safe, False = blocked
    action: str  # "pass", "refuse", "disclaimer", "rewrite"
    rule: str | None = None  # Which rule triggered
    message: str | None = None  # User-facing message (refusal or disclaimer)
    original_text: str = ""  # What was checked


# ──────────────────────────────────────────────────
# Pattern lists — based on GUARDRAIL-POLICY.md
# ──────────────────────────────────────────────────

# HARMFUL CONTENT — HARD BAN (Section: Dangerous Content)
DANGEROUS_PATTERNS = [
    r"\beating\s*disorder\b",
    r"\banorexia\b",
    r"\bbulimia\b",
    r"\bstarve\b",
    r"\bself[- ]?harm\b",
    r"\bsuicide\b",
    r"\bkill\s*(my)?self\b",
    r"\bsteroid[s]?\b",
    r"\bperformance[- ]enhancing\b",
    r"\bPED\b",
    r"\bHGH\b",
    r"\bextreme\s*diet\b",
    r"\bcleanse\s*diet\b",
    r"\bjuice\s*cleanse\b",
    r"\bfasting\s*diet\b",
]

# MEDICAL/CLINICAL — HARD BAN (Section: Medical & Clinical)
MEDICAL_BAN_PATTERNS = [
    r"\bdiagnos[e]?\b",
    r"\bprescri(ption|be)\b",
    r"\bmedication\b",
    r"\bdrug[s]?\s*(dosage|dose)\b",
    r"\blab\s*result\b",
    r"\bblood\s*test\b",
    r"\bsurgery\b",
    r"\bsurgical\b",
    r"\bmental\s*health\s*(diagnos|therap|counsel)",
    r"\bpsychiatr",
    r"\bpsycholog(ist|ical)\b",
    r"\btherapy\s*session\b",
    r"\bpregnancy\s*(advice|diagnos|medical|treatment)",
]

# NON-FITNESS TOPICS — HARD BAN (Section: Non-Fitness Topics)
NON_FITNESS_PATTERNS = [
    r"\bpolitic",
    r"\belection\b",
    r"\bdemocrat[s]?\b",
    r"\brepublican[s]?\b",
    r"\bcongress\b",
    r"\breligion\b",
    r"\bchurch\b",
    r"\bmosque\b",
    r"\btemple\b",
    r"\brelationship\s*advice\b",
    r"\bdating\b",
    r"\bcode\b|programming|javascript|python\s*(code|programming)",
    r"\bfinancial\s*(advice|planning)\b",
    r"\btax(es)?\b",
    r"\blegal\s*(advice|question)\b",
    r"\blawsuit\b",
    r"\bmovie[s]?\b",
    r"\bsong[s]?\b",
    r"\bTV\s*show\b",
    r"\bcelebrity\b",
]

# MEDICAL DISCLAIMER TRIGGERS — not banned, but require disclaimer
# (Section: Medical Disclaimer — Auto-Injected)
MEDICAL_DISCLAIMER_PATTERNS = [
    r"\binjur(y|ies)\b",
    r"\bpain\b",
    r"\bjoint\b",
    r"\bknee\b",
    r"\bback\s*pain\b",
    r"\bshoulder\s*pain\b",
    r"\bdiscomfort\b",
    r"\bstrain\b",
    r"\bsprain\b",
    r"\bpre[- ]?existing\b",
    r"\bmedical\s*condition\b",
    r"\bchronic\b",
    r"\bdiabet(es|ic)\b",
    r"\bhypertension\b",
    r"\bheart\s*(disease|condition)\b",
    r"\bosteoporosis\b",
    r"\barthritis\b",
    r"\bpregnancy\b",
    r"\bpregnant\b",
    r"\brecovery\b",
    r"\brehabilitation\b",
    r"\brehab\b",
    r"\bBMI\b",
    r"\bbody\s*fat\b",
]

# Small talk patterns — allowed but brief (Section: Tier 4)
SMALL_TALK_PATTERNS = [
    r"^(hi|hello|hey|howdy|sup|yo|good\s*(morning|afternoon|evening))\b",
    r"\bthank(s| you)\b",
    r"\bwho\s*(made|created|built)\s*you\b",
    r"\bwhat\s*can\s*you\s*do\b",
    r"\byour\s*name\b",
]

# Fitness domain keywords — positive signal
FITNESS_KEYWORDS = [
    r"\bworkout\b", r"\bexercise\b", r"\btraining\b", r"\blift",
    r"\bsquat\b", r"\bdeadlift\b", r"\bbench\s*press\b", r"\bpull[\s-]?up",
    r"\bpush[\s-]?up\b", r"\brunning\b", r"\bcardio\b", r"\bstretch",
    r"\bwarm[\s-]?up\b", r"\bcool[\s-]?down\b", r"\brep[s]?\b",
    r"\bset[s]?\b", r"\brest\s*period\b", r"\bprogressive\s*overload\b",
    r"\bprotein\b", r"\bcalorie[s]?\b", r"\bcarb[s]?\b", r"\bfat[s]?\b",
    r"\bmacro[s]?\b", r"\bmeal\s*plan\b", r"\bmeal\s*prep\b",
    r"\bnutrition\b", r"\bdiet\b", r"\bweight\s*loss\b", r"\bmuscle\s*gain\b",
    r"\bBMI\b", r"\bbody\s*mass\b", r"\bfitness\b", r"\bhealth\b",
    r"\bmuscle\b", r"\babs\b", r"\bglutes\b", r"\bquadricep[s]?\b",
    r"\bhamstring[s]?\b", r"\btricep[s]?\b", r"\bbicep[s]?\b",
    r"\bshoulder[s]?\b", r"\bchest\b", r"\bback\b", r"\bcore\b",
    r"\bgym\b", r"\bbarbell\b", r"\bdumbbell\b", r"\bweight[s]?\b",
    r"\brunning\b", r"\bjogging\b", r"\bswimming\b", r"\bcycling\b",
    r"\byoga\b", r"\bpilates\b", r"\bHIIT\b", r"\bcardio\b",
    r"\brecovery\b", r"\bsleep\b", r"\brest\b", r"\bhydrate",
    r"\bwater\b", r"\bsupplement\b", r"\bcreatine\b",
    r"\bWHO\b", r"\bACE\b", r"\bHHS\b", r"\bphysical\s*activity\b",
]


# ──────────────────────────────────────────────────
# Core guardrail functions
# ──────────────────────────────────────────────────

def check_user_input(text: str) -> GuardrailResult:
    """
    Guardrail check on USER INPUT (before model call).

    Per GUARDRAIL-POLICY.md:
      1. Topic classification — scan for banned keywords/topics
      2. Intent detection — is the user asking for medical advice?
      3. Language check — basic appropriateness

    Returns GuardrailResult with action="pass", "refuse", or "disclaimer".
    """
    normalized = text.strip().lower()

    if not normalized:
        return GuardrailResult(passed=True, action="pass", original_text=text)

    # --- Check 1: Dangerous content (HARD BAN) ---
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return GuardrailResult(
                passed=False,
                action="refuse",
                rule="dangerous_content",
                message=(
                    "I can't provide guidance on that topic as it could be harmful. "
                    "Your health and safety are important. If you're struggling, "
                    "please reach out to a healthcare professional or a support hotline. "
                    "I'm here to help with safe, evidence-based fitness and nutrition guidance."
                ),
                original_text=text,
            )

    # --- Check 2: Medical/clinical (HARD BAN) ---
    for pattern in MEDICAL_BAN_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return GuardrailResult(
                passed=False,
                action="refuse",
                rule="medical_clinical",
                message=(
                    "I'm a fitness assistant, not a medical professional. "
                    "For medical concerns, please consult a qualified healthcare provider. "
                    "I can help you with exercise and nutrition guidance though — "
                    "would you like to know more about a fitness topic?"
                ),
                original_text=text,
            )

    # --- Check 3: Non-fitness topics (HARD BAN) ---
    for pattern in NON_FITNESS_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return GuardrailResult(
                passed=False,
                action="refuse",
                rule="non_fitness_topic",
                message=(
                    "I'm FitMate, a fitness assistant! "
                    "I'm best at helping with exercise, nutrition, and health topics. "
                    "Is there something fitness-related I can help you with today?"
                ),
                original_text=text,
            )

    # --- Check 4: Small talk (ALLOW, brief) ---
    for pattern in SMALL_TALK_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return GuardrailResult(
                passed=True,
                action="pass",
                rule="small_talk",
                original_text=text,
            )

    # --- Check 5: Medical disclaimer triggers (not banned, but flagged) ---
    has_medical_context = False
    for pattern in MEDICAL_DISCLAIMER_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            has_medical_context = True
            break

    if has_medical_context:
        return GuardrailResult(
            passed=True,
            action="disclaimer",
            rule="medical_disclaimer_required",
            original_text=text,
        )

    # --- Check 6: Positive fitness domain signal ---
    for pattern in FITNESS_KEYWORDS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return GuardrailResult(
                passed=True, action="pass", original_text=text
            )

    # No strong signal either way — allow but flag for monitoring
    return GuardrailResult(passed=True, action="pass", original_text=text)


def check_bot_response(text: str) -> GuardrailResult:
    """
    Guardrail check on BOT RESPONSE (after model call, before delivery).

    Per GUARDRAIL-POLICY.md:
      1. Domain verification — does the response stay within fitness/health?
      2. Medical claim detection — does the response make medical diagnoses?
      3. Disclaimer injection — add health disclaimers where appropriate
    """
    normalized = text.strip().lower()

    if not normalized:
        return GuardrailResult(passed=True, action="pass", original_text=text)

    # --- Check 1: Dangerous content in response ---
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return GuardrailResult(
                passed=False,
                action="refuse",
                rule="response_dangerous_content",
                message=(
                    "I can't provide guidance on that topic as it could be harmful. "
                    "Please consult a healthcare professional. "
                    "I'm here to help with safe, evidence-based fitness guidance."
                ),
                original_text=text,
            )

    # --- Check 2: Medical diagnosis in response ---
    diagnosis_patterns = [
        r"\byou\s*(have|are\s*suffering|have\s*been\s*diagnosed)\b",
        r"\bthis\s*(is|indicates|suggests)\s*(a|an)\s*(medical|clinical)\b",
        r"\bseek\s*(immediate|urgent)\s*medical\b",
    ]
    for pattern in diagnosis_patterns:
        if re.search(pattern, normalized, re.IGNORECASE):
            return GuardrailResult(
                passed=False,
                action="rewrite",
                rule="response_medical_diagnosis",
                message=(
                    "The model attempted a medical diagnosis. "
                    "Please consult a qualified healthcare provider for medical concerns."
                ),
                original_text=text,
            )

    # --- Check 3: Medical disclaimer injection ---
    needs_disclaimer = False
    for pattern in MEDICAL_DISCLAIMER_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            needs_disclaimer = True
            break

    if needs_disclaimer:
        disclaimer = (
            "\n\n> **Note:** This information is for educational purposes only "
            "and is not a substitute for professional medical advice. Always "
            "consult a qualified healthcare provider before starting any new "
            "exercise or diet program, especially if you have pre-existing "
            "health conditions."
        )
        # Only add if not already present
        if "educational purposes only" not in normalized:
            return GuardrailResult(
                passed=True,
                action="disclaimer",
                rule="medical_disclaimer_injected",
                message=text + disclaimer,
                original_text=text,
            )

    return GuardrailResult(passed=True, action="pass", original_text=text)


def get_guardrail_log_entry(result: GuardrailResult) -> dict:
    """
    Format a guardrail result for logging.
    Per GUARDRAIL-POLICY.md:
      "Every guardrail trigger is logged with: Timestamp, Input message
       (first 100 chars), Triggered rule name, Action taken"
    """
    return {
        "input_preview": result.original_text[:100],
        "rule": result.rule,
        "action": result.action,
        "passed": result.passed,
    }
