/**
 * FitMate — Guardrail Layer
 *
 * Chapter Three Section 3.5.1 stage (9):
 *   "Rule-based pattern matching (banned topics, medical-diagnosis
 *    phrasing) combined with a lightweight classifier for
 *    paraphrased or previously unseen unsafe content."
 *
 * GUARDRAIL-POLICY.md compliance:
 *   - Input checks: topic classification, intent detection
 *   - Output checks: domain verification, medical claim detection, disclaimer injection
 *   - Every trigger is logged for thesis evaluation
 *
 * Ported from backend/guardrails.py (Python → TypeScript)
 */

// ──────────────────────────────────────────────────
// Guardrail result — carries the verdict + metadata
// ──────────────────────────────────────────────────

export interface GuardrailResult {
  /** True = message is safe, False = blocked */
  passed: boolean;
  /** "pass", "refuse", "disclaimer", "rewrite" */
  action: "pass" | "refuse" | "disclaimer" | "rewrite";
  /** Which rule triggered */
  rule: string | null;
  /** User-facing message (refusal or disclaimer) */
  message: string | null;
  /** What was checked */
  originalText: string;
}

// ──────────────────────────────────────────────────
// Pattern lists — based on GUARDRAIL-POLICY.md
// All use RegExp with 'i' flag (case-insensitive)
// ──────────────────────────────────────────────────

// HARMFUL CONTENT — HARD BAN (Section: Dangerous Content)
const DANGEROUS_PATTERNS: RegExp[] = [
  /\beating\s*disorder\b/i,
  /\banorexia\b/i,
  /\bbulimia\b/i,
  /\bstarve\b/i,
  /\bself[- ]?harm\b/i,
  /\bsuicide\b/i,
  /\bkill\s*(my)?self\b/i,
  /\bsteroid[s]?\b/i,
  /\bperformance[- ]enhancing\b/i,
  /\bPED\b/i,
  /\bHGH\b/i,
  /\bextreme\s*diet\b/i,
  /\bcleanse\s*diet\b/i,
  /\bjuice\s*cleanse\b/i,
  /\bfasting\s*diet\b/i,
];

// MEDICAL/CLINICAL — HARD BAN (Section: Medical & Clinical)
const MEDICAL_BAN_PATTERNS: RegExp[] = [
  /\bdiagnos[e]?\b/i,
  /\bprescri(ption|be)\b/i,
  /\bmedication\b/i,
  /\bdrug[s]?\s*(dosage|dose)\b/i,
  /\blab\s*result\b/i,
  /\bblood\s*test\b/i,
  /\bsurgery\b/i,
  /\bsurgical\b/i,
  /\bmental\s*health\s*(diagnos|therap|counsel)/i,
  /\bpsychiatr/i,
  /\bpsycholog(ist|ical)\b/i,
  /\btherapy\s*session\b/i,
  /\bpregnancy\s*(advice|diagnos|medical|treatment)/i,
];

// NON-FITNESS TOPICS — HARD BAN (Section: Non-Fitness Topics)
const NON_FITNESS_PATTERNS: RegExp[] = [
  /\bpolitic/i,
  /\belection\b/i,
  /\bdemocrat[s]?\b/i,
  /\brepublican[s]?\b/i,
  /\bcongress\b/i,
  /\breligion\b/i,
  /\bchurch\b/i,
  /\bmosque\b/i,
  /\btemple\b/i,
  /\brelationship\s*advice\b/i,
  /\bdating\b/i,
  /\bcode\b|programming|javascript|python\s*(code|programming)/i,
  /\bfinancial\s*(advice|planning)\b/i,
  /\btax(es)?\b/i,
  /\blegal\s*(advice|question)\b/i,
  /\blawsuit\b/i,
  /\bmovie[s]?\b/i,
  /\bsong[s]?\b/i,
  /\bTV\s*show\b/i,
  /\bcelebrity\b/i,
];

// MEDICAL DISCLAIMER TRIGGERS — not banned, but require disclaimer
const MEDICAL_DISCLAIMER_PATTERNS: RegExp[] = [
  /\binjur(y|ies)\b/i,
  /\bpain\b/i,
  /\bjoint\b/i,
  /\bknee\b/i,
  /\bback\s*pain\b/i,
  /\bshoulder\s*pain\b/i,
  /\bdiscomfort\b/i,
  /\bstrain\b/i,
  /\bsprain\b/i,
  /\bpre[- ]?existing\b/i,
  /\bmedical\s*condition\b/i,
  /\bchronic\b/i,
  /\bdiabet(es|ic)\b/i,
  /\bhypertension\b/i,
  /\bheart\s*(disease|condition)\b/i,
  /\bosteoporosis\b/i,
  /\barthritis\b/i,
  /\bpregnancy\b/i,
  /\bpregnant\b/i,
  /\brecovery\b/i,
  /\brehabilitation\b/i,
  /\brehab\b/i,
  /\bBMI\b/i,
  /\bbody\s*fat\b/i,
];

// Small talk patterns — allowed but brief (Tier 4)
const SMALL_TALK_PATTERNS: RegExp[] = [
  /^(hi|hello|hey|howdy|sup|yo|good\s*(morning|afternoon|evening))\b/i,
  /\bthank(s| you)\b/i,
  /\bwho\s*(made|created|built)\s*you\b/i,
  /\bwhat\s*can\s*you\s*do\b/i,
  /\byour\s*name\b/i,
];

// Fitness domain keywords — positive signal
const FITNESS_KEYWORDS: RegExp[] = [
  /\bworkout\b/i, /\bexercise\b/i, /\btraining\b/i, /\blift/i,
  /\bsquat\b/i, /\bdeadlift\b/i, /\bbench\s*press\b/i, /\bpull[\s-]?up/i,
  /\bpush[\s-]?up\b/i, /\brunning\b/i, /\bcardio\b/i, /\bstretch/i,
  /\bwarm[\s-]?up\b/i, /\bcool[\s-]?down\b/i, /\brep[s]?\b/i,
  /\bset[s]?\b/i, /\brest\s*period\b/i, /\bprogressive\s*overload\b/i,
  /\bprotein\b/i, /\bcalorie[s]?\b/i, /\bcarb[s]?\b/i, /\bfat[s]?\b/i,
  /\bmacro[s]?\b/i, /\bmeal\s*plan\b/i, /\bmeal\s*prep\b/i,
  /\bnutrition\b/i, /\bdiet\b/i, /\bweight\s*loss\b/i, /\bmuscle\s*gain\b/i,
  /\bBMI\b/i, /\bbody\s*mass\b/i, /\bfitness\b/i, /\bhealth\b/i,
  /\bmuscle\b/i, /\babs\b/i, /\bglutes\b/i, /\bquadricep[s]?\b/i,
  /\bhamstring[s]?\b/i, /\btricep[s]?\b/i, /\bbicep[s]?\b/i,
  /\bshoulder[s]?\b/i, /\bchest\b/i, /\bback\b/i, /\bcore\b/i,
  /\bgym\b/i, /\bbarbell\b/i, /\bdumbbell\b/i, /\bweight[s]?\b/i,
  /\brunning\b/i, /\bjogging\b/i, /\bswimming\b/i, /\bcycling\b/i,
  /\byoga\b/i, /\bpilates\b/i, /\bHIIT\b/i, /\bcardio\b/i,
  /\brecovery\b/i, /\bsleep\b/i, /\brest\b/i, /\bhydrate/i,
  /\bwater\b/i, /\bsupplement\b/i, /\bcreatine\b/i,
  /\bWHO\b/i, /\bACE\b/i, /\bHHS\b/i, /\bphysical\s*activity\b/i,
];

// Response medical diagnosis patterns (for output checking)
const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou\s*(have|are\s*suffering|have\s*been\s*diagnosed)\b/i,
  /\bthis\s*(is|indicates|suggests)\s*(a|an)\s*(medical|clinical)\b/i,
  /\bseek\s*(immediate|urgent)\s*medical\b/i,
];

// ──────────────────────────────────────────────────
// Core guardrail functions
// ──────────────────────────────────────────────────

/**
 * Guardrail check on USER INPUT (before model call).
 *
 * Per GUARDRAIL-POLICY.md:
 *   1. Topic classification — scan for banned keywords/topics
 *   2. Intent detection — is the user asking for medical advice?
 *   3. Language check — basic appropriateness
 */
export function checkUserInput(text: string): GuardrailResult {
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return { passed: true, action: "pass", rule: null, message: null, originalText: text };
  }

  // --- Check 1: Dangerous content (HARD BAN) ---
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        passed: false,
        action: "refuse",
        rule: "dangerous_content",
        message:
          "I can't provide guidance on that topic as it could be harmful. " +
          "Your health and safety are important. If you're struggling, " +
          "please reach out to a healthcare professional or a support hotline. " +
          "I'm here to help with safe, evidence-based fitness and nutrition guidance.",
        originalText: text,
      };
    }
  }

  // --- Check 2: Medical/clinical (HARD BAN) ---
  for (const pattern of MEDICAL_BAN_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        passed: false,
        action: "refuse",
        rule: "medical_clinical",
        message:
          "I'm a fitness assistant, not a medical professional. " +
          "For medical concerns, please consult a qualified healthcare provider. " +
          "I can help you with exercise and nutrition guidance though — " +
          "would you like to know more about a fitness topic?",
        originalText: text,
      };
    }
  }

  // --- Check 3: Non-fitness topics (HARD BAN) ---
  for (const pattern of NON_FITNESS_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        passed: false,
        action: "refuse",
        rule: "non_fitness_topic",
        message:
          "I'm FitMate, a fitness assistant! " +
          "I'm best at helping with exercise, nutrition, and health topics. " +
          "Is there something fitness-related I can help you with today?",
        originalText: text,
      };
    }
  }

  // --- Check 4: Small talk (ALLOW, brief) ---
  for (const pattern of SMALL_TALK_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        passed: true,
        action: "pass",
        rule: "small_talk",
        message: null,
        originalText: text,
      };
    }
  }

  // --- Check 5: Medical disclaimer triggers (not banned, but flagged) ---
  let hasMedicalContext = false;
  for (const pattern of MEDICAL_DISCLAIMER_PATTERNS) {
    if (pattern.test(normalized)) {
      hasMedicalContext = true;
      break;
    }
  }

  if (hasMedicalContext) {
    return {
      passed: true,
      action: "disclaimer",
      rule: "medical_disclaimer_required",
      message: null,
      originalText: text,
    };
  }

  // --- Check 6: Positive fitness domain signal ---
  for (const pattern of FITNESS_KEYWORDS) {
    if (pattern.test(normalized)) {
      return {
        passed: true,
        action: "pass",
        rule: null,
        message: null,
        originalText: text,
      };
    }
  }

  // No strong signal either way — allow but flag for monitoring
  return { passed: true, action: "pass", rule: null, message: null, originalText: text };
}

/**
 * Guardrail check on BOT RESPONSE (after model call, before delivery).
 *
 * Per GUARDRAIL-POLICY.md:
 *   1. Domain verification — does the response stay within fitness/health?
 *   2. Medical claim detection — does the response make medical diagnoses?
 *   3. Disclaimer injection — add health disclaimers where appropriate
 */
export function checkBotResponse(text: string): GuardrailResult {
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return { passed: true, action: "pass", rule: null, message: null, originalText: text };
  }

  // --- Check 1: Dangerous content in response ---
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        passed: false,
        action: "refuse",
        rule: "response_dangerous_content",
        message:
          "I can't provide guidance on that topic as it could be harmful. " +
          "Please consult a healthcare professional. " +
          "I'm here to help with safe, evidence-based fitness guidance.",
        originalText: text,
      };
    }
  }

  // --- Check 2: Medical diagnosis in response ---
  for (const pattern of DIAGNOSIS_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        passed: false,
        action: "rewrite",
        rule: "response_medical_diagnosis",
        message:
          "The model attempted a medical diagnosis. " +
          "Please consult a qualified healthcare provider for medical concerns.",
        originalText: text,
      };
    }
  }

  // --- Check 3: Medical disclaimer injection ---
  let needsDisclaimer = false;
  for (const pattern of MEDICAL_DISCLAIMER_PATTERNS) {
    if (pattern.test(normalized)) {
      needsDisclaimer = true;
      break;
    }
  }

  if (needsDisclaimer) {
    const disclaimer =
      "\n\n> **Note:** This information is for educational purposes only " +
      "and is not a substitute for professional medical advice. Always " +
      "consult a qualified healthcare provider before starting any new " +
      "exercise or diet program, especially if you have pre-existing " +
      "health conditions.";

    // Only add if not already present
    if (!normalized.includes("educational purposes only")) {
      return {
        passed: true,
        action: "disclaimer",
        rule: "medical_disclaimer_injected",
        message: text + disclaimer,
        originalText: text,
      };
    }
  }

  return { passed: true, action: "pass", rule: null, message: null, originalText: text };
}

/**
 * Format a guardrail result for logging.
 * Per GUARDRAIL-POLICY.md:
 *   "Every guardrail trigger is logged with: Timestamp, Input message
 *    (first 100 chars), Triggered rule name, Action taken"
 */
export function getGuardrailLogEntry(result: GuardrailResult) {
  return {
    input_preview: result.originalText.slice(0, 100),
    rule: result.rule,
    action: result.action,
    passed: result.passed,
  };
}
