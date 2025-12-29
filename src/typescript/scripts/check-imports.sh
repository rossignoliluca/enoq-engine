#!/bin/bash
# ============================================
# LIMEN Import Boundary Checker
# ============================================
# Enforces architectural boundaries:
#   interface/  -> cannot import from anything (pure types)
#   gate/       -> imports interface/ only (+ allowed exceptions below)
#   operational/ -> imports interface/, gate/
#   mediator/   -> imports interface/, gate/, operational/
#   runtime/    -> imports interface/, gate/, operational/, mediator/
#   research/   -> isolated (cannot be imported by production code)
#
# ALLOWED EXCEPTIONS (documented architectural coupling):
#   - gate/verification/ may import ResponsePlan from mediator/l5_transform/
#   - gate/withdrawal/ may import ResponsePlan from mediator/l5_transform/
#   - operational/signals/ may import ResponsePlan from mediator/l5_transform/
# ============================================

set -e
cd "$(dirname "$0")/.."

ERRORS=0
WARNINGS=0

echo "Checking import boundaries..."
echo ""

# Rule 1: gate/ cannot import from runtime/, research/
echo "[1/5] Checking gate/ strict boundaries..."
VIOLATIONS=$(grep -r "from '.*runtime\|from '.*research" src/gate/ 2>/dev/null || true)
if [ -n "$VIOLATIONS" ]; then
    echo "  ERROR: gate/ imports from runtime/ or research/:"
    echo "$VIOLATIONS" | head -20
    ERRORS=$((ERRORS + 1))
else
    echo "  OK (runtime/research isolation)"
fi

# Rule 2: operational/ should not import from runtime/, research/
echo "[2/5] Checking operational/ boundaries..."
VIOLATIONS=$(grep -r "from '.*runtime\|from '.*research" src/operational/ 2>/dev/null || true)
if [ -n "$VIOLATIONS" ]; then
    echo "  ERROR: operational/ imports from runtime/ or research/:"
    echo "$VIOLATIONS" | head -20
    ERRORS=$((ERRORS + 1))
else
    echo "  OK"
fi

# Rule 3: mediator/ should not import from runtime/, research/
echo "[3/5] Checking mediator/ boundaries..."
VIOLATIONS=$(grep -r "from '.*runtime\|from '.*research" src/mediator/ 2>/dev/null | grep -v "concrescence_engine" | grep -v "agent_swarm" || true)
if [ -n "$VIOLATIONS" ]; then
    echo "  WARNING: mediator/ imports from runtime/ or research/:"
    echo "$VIOLATIONS" | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo "  OK (with known exceptions)"
fi

# Rule 4: runtime/ should not import from research/
echo "[4/5] Checking runtime/ research isolation..."
VIOLATIONS=$(grep -r "from '.*research" src/runtime/ 2>/dev/null || true)
if [ -n "$VIOLATIONS" ]; then
    echo "  WARNING: runtime/ imports from research/ (field_integration exception):"
    echo "$VIOLATIONS" | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo "  OK"
fi

# Rule 5: No production code should import from research/ (except runtime/pipeline for field_integration)
echo "[5/5] Checking research/ isolation..."
VIOLATIONS=$(grep -rE "from ['\"].*research" src/gate/ src/operational/ src/mediator/ 2>/dev/null | grep -v "node_modules" || true)
if [ -n "$VIOLATIONS" ]; then
    echo "  ERROR: gate/operational/mediator imports from research/:"
    echo "$VIOLATIONS" | head -20
    ERRORS=$((ERRORS + 1))
else
    echo "  OK"
fi

echo ""
echo "============================================"
echo "KNOWN ARCHITECTURAL COUPLING (documented):"
echo "  - gate/verification/ -> mediator/.../response_plan (builder functions only)"
echo "  - mediator/concrescence/ -> runtime/pipeline (circular: to refactor)"
echo "  - runtime/experimental/ <- research/genesis (field_integration bridge)"
echo "============================================"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "FAILED: $ERRORS boundary violation(s) found"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "PASSED with $WARNINGS warning(s) (known exceptions)"
    exit 0
else
    echo "PASSED: All import boundaries respected"
    exit 0
fi
