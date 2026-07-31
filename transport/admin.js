import { OWNER, ADMINS } from '../config.js';

export function toNumber(jid) {
  if (typeof jid !== 'string') return jid;
  const match = jid.match(/^(\d+)/);
  return match ? match[1] : jid;
}

export function isPhoneJid(jid) {
  if (typeof jid !== 'string') return false;
  // Phone JIDs: bare number or @s.whatsapp.net domain (ignoring device suffix)
  const domain = jid.split('@')[1];
  return !domain || domain === 's.whatsapp.net';
}

export function isAdmin({ sender, isGroup, groupAdmins }) {
  const senderNumber = toNumber(sender);

  // Only check OWNER/ADMINS for actual phone JIDs, not @lid
  if (isPhoneJid(sender)) {
    if (senderNumber === OWNER) return true;
    if (ADMINS.includes(senderNumber)) return true;
  }

  if (isGroup && groupAdmins?.length > 0) {
    const adminNumbers = groupAdmins.map(toNumber);
    if (adminNumbers.includes(senderNumber)) return true;
  }

  return false;
}

// LID addressing: `sender` may be a `@lid` JID (no phone-form OWNER/ADMINS match
// possible, by design — see isAdmin above) while `senderPn` carries the phone-form
// JID for the same participant (may be undefined). Group-admin JIDs arrive in
// whatever namespace the group uses (same as `sender`), so try both forms.
export function isAdminEither({ sender, senderPn, isGroup, groupAdmins }) {
  if (isAdmin({ sender: senderPn, isGroup, groupAdmins })) return true;
  return isAdmin({ sender, isGroup, groupAdmins });
}
