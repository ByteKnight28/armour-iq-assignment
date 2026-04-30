const INJECTION_PATTERNS = [
    /ignore (all |your )?(previous |prior )?instructions/i,
    /you are now/i,
    /disregard .{0,30} rules/i,
    /pretend you (are|have)/i,
    /system prompt/i,
    /jailbreak/i,
    /do anything now/i,
    /bypass (the |your )?(guardrail|policy|filter)/i,
    /forget (all |your )?instructions/i,
    /override (all |your )?(safety|policy|rules)/i,
];

export function promptFirewall(prompt) {
    const matched = INJECTION_PATTERNS.find(p => p.test(prompt));

    if (matched) {
        console.warn(`[Firewall] Injection attempt blocked. Pattern: ${matched}`);
        return {
            blocked: true,
            error:   "INJECTION_DETECTED",
            message: "Potential prompt injection detected. Request blocked by security policy."
        };
    }

    return { blocked: false };
}
