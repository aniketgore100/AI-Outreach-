/** Escapes regex metacharacters so user-supplied search text is always used
 * as a literal substring match — never as an attacker-controlled pattern.
 * This is what makes building a MongoDB $regex from free-text input safe:
 * with every special character escaped, the resulting pattern can't express
 * catastrophic backtracking (ReDoS) or any operator semantics at all. */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegex };
