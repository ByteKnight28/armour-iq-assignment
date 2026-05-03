import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables (will pick up from backend if run as child process, or local .env if standalone)
dotenv.config();

const ALGORITHM  = "aes-256-gcm";
const SALT       = "armouriq-secretvault-v1";
const KEY        = crypto.scryptSync(process.env.VAULT_KEY ?? "default-dev-key", SALT, 32);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("[Vault] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function loadStore() {
    try {
        const { data, error } = await supabase
            .from("vault_store")
            .select("state")
            .eq("id", 1)
            .single();

        if (error) {
            console.error("[Vault] Error loading store from Supabase:", error.message);
            return { secrets: {}, auditLog: [] };
        }

        if (data && data.state) {
            return data.state;
        }
        
        return { secrets: {}, auditLog: [] };
    } catch (err) {
        console.error("[Vault] Exception loading store:", err.message);
        return { secrets: {}, auditLog: [] };
    }
}

export async function saveStore(store) {
    try {
        const { error } = await supabase
            .from("vault_store")
            .upsert({ id: 1, state: store });
            
        if (error) {
            console.error("[Vault] Error saving store to Supabase:", error.message);
        }
    } catch (err) {
        console.error("[Vault] Exception saving store:", err.message);
    }
}

export function encrypt(plaintext) {
    const iv         = crypto.randomBytes(12);
    const cipher     = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted  = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag    = cipher.getAuthTag();
    return {
        iv:       iv.toString("hex"),
        authTag:  authTag.toString("hex"),
        data:     encrypted.toString("hex")
    };
}

export function decrypt(encryptedObj) {
    const decipher = crypto.createDecipheriv(
        ALGORITHM, KEY, Buffer.from(encryptedObj.iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(encryptedObj.authTag, "hex"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedObj.data, "hex")),
        decipher.final()
    ]);
    return decrypted.toString("utf8");
}
