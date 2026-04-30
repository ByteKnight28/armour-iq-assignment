import crypto from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const STORE_PATH = "./src/store.json";
const ALGORITHM  = "aes-256-gcm";
const KEY        = crypto.scryptSync(process.env.VAULT_KEY ?? "default-dev-key", "salt", 32);

function loadStore() {
    if (!existsSync(STORE_PATH)) return { secrets: {}, auditLog: [] };
    return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
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

export function logAccess(secretName, action) {
    const store = loadStore();
    store.auditLog.push({ secretName, action, timestamp: new Date().toISOString() });
    saveStore(store);
}

export { loadStore, saveStore };
