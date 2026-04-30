import crypto from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "store.json");
const ALGORITHM  = "aes-256-gcm";
const SALT       = "armouriq-secretvault-v1";
const KEY        = crypto.scryptSync(process.env.VAULT_KEY ?? "default-dev-key", SALT, 32);

function loadStore() {
    if (!existsSync(STORE_PATH)) return { secrets: {}, auditLog: [] };
    try {
        return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
    } catch {
        // If store.json is corrupted, start fresh
        return { secrets: {}, auditLog: [] };
    }
}

function saveStore(store) {
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
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

export { loadStore, saveStore };
