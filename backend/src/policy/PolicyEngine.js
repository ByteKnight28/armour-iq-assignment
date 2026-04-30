import { createClient } from "@supabase/supabase-js";

class PolicyEngine {
    constructor() {
        this.rules    = new Map();
        this.supabase = null;
    }

    async init() {
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        // Load all rules from DB on startup
        const { data, error } = await this.supabase.from("policies").select("*");
        if (error) {
            console.error(`[PolicyEngine] Failed to load policies: ${error.message}`);
            return;
        }
        if (data) {
            data.forEach(row => this.rules.set(row.tool_name, row));
        }

        // Live sync via WebSocket — no restart needed
        this.supabase
            .channel("policy-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "policies" },
                (payload) => {
                    if (payload.eventType === "DELETE") {
                        this.rules.delete(payload.old.tool_name);
                        console.log(`[PolicyEngine] Rule deleted: ${payload.old.tool_name}`);
                    } else {
                        this.rules.set(payload.new.tool_name, payload.new);
                        console.log(`[PolicyEngine] Rule updated: ${payload.new.tool_name} → ${payload.new.action}`);
                    }
                })
            .subscribe();

        console.log(`[PolicyEngine] Loaded ${this.rules.size} rules, listening for changes.`);
    }

    evaluate(toolName, toolArgs) {
        const rule = this.rules.get(toolName);

        // Default: allow unknown tools
        if (!rule) return { decision: "ALLOW" };

        if (rule.action === "BLOCK")
            return { decision: "BLOCK", reason: `Tool '${toolName}' is blocked by policy.` };

        if (rule.action === "APPROVAL")
            return { decision: "APPROVAL" };

        // Input validation
        if (rule.input_rules && Object.keys(rule.input_rules).length > 0) {
            for (const [param, constraint] of Object.entries(rule.input_rules)) {
                if (constraint.startsWith && toolArgs[param] && !toolArgs[param].startsWith(constraint.startsWith)) {
                    return {
                        decision: "BLOCK",
                        reason: `Validation failed: '${param}' must start with '${constraint.startsWith}'`
                    };
                }
            }
        }

        return { decision: "ALLOW" };
    }
}

export default new PolicyEngine();
