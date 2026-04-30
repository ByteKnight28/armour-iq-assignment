import { encrypt, decrypt, loadStore, saveStore } from "./vault.js";

export function storeSecret({ name, value, description = "" }) {
    const store = loadStore();
    if (store.secrets[name]) {
        return { success: false, error: `Secret '${name}' already exists. Use rotate_secret to update.` };
    }
    store.secrets[name] = {
        encrypted:   encrypt(value),
        description,
        createdAt:   new Date().toISOString(),
        rotatedAt:   null,
        history:     []
    };
    store.auditLog.push({ secretName: name, action: "STORE", timestamp: new Date().toISOString() });
    saveStore(store);
    return { success: true, message: `Secret '${name}' stored and encrypted successfully.` };
}

export function retrieveSecret({ name }) {
    const store = loadStore();
    const secret = store.secrets[name];
    if (!secret) return { success: false, error: `Secret '${name}' not found.` };
    const value = decrypt(secret.encrypted);
    store.auditLog.push({ secretName: name, action: "RETRIEVE", timestamp: new Date().toISOString() });
    saveStore(store);
    return { success: true, name, value, description: secret.description, createdAt: secret.createdAt };
}

export function rotateSecret({ name, new_value }) {
    const store = loadStore();
    const secret = store.secrets[name];
    if (!secret) return { success: false, error: `Secret '${name}' not found.` };
    secret.history.push({ encrypted: secret.encrypted, rotatedAt: new Date().toISOString() });
    secret.encrypted  = encrypt(new_value);
    secret.rotatedAt  = new Date().toISOString();
    store.auditLog.push({ secretName: name, action: "ROTATE", timestamp: new Date().toISOString() });
    saveStore(store);
    return { success: true, message: `Secret '${name}' rotated. Previous version archived in history.` };
}

export function auditAccess({ name }) {
    const store = loadStore();
    const logs  = store.auditLog.filter(l => l.secretName === name);
    if (!logs.length) return { success: false, error: `No audit logs found for '${name}'.` };
    return { success: true, name, accessLog: logs };
}

export function revokeSecret({ name }) {
    const store = loadStore();
    if (!store.secrets[name]) return { success: false, error: `Secret '${name}' not found.` };
    delete store.secrets[name];
    store.auditLog.push({ secretName: name, action: "REVOKE", timestamp: new Date().toISOString() });
    saveStore(store);
    return { success: true, message: `Secret '${name}' permanently revoked and deleted.` };
}
