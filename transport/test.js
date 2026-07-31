import assert from 'node:assert/strict';
import { parseCommand } from './commands.js';

// Set environment variables before importing modules that touch config
process.env.PHONE_NUMBER = '1234567890';
process.env.OWNER = '9876543210';
process.env.ADMINS = '1111111111,2222222222';

// Dynamic import for modules that depend on config
const { toNumber, isPhoneJid, isAdmin, isAdminEither } = await import('./admin.js');
const { shouldSkip, resolveSender, addSentId, SENT_ID_CAP } = await import('./wa.js');

const tests = [
  {
    name: 'prefixed command with args',
    input: ['.wcg start hard', '.'],
    expected: { cmd: 'wcg', args: ['start', 'hard'] },
  },
  {
    name: 'case insensitive cmd',
    input: ['.WCG test', '.'],
    expected: { cmd: 'wcg', args: ['test'] },
  },
  {
    name: 'trims whitespace',
    input: ['  .ping  ', '.'],
    expected: { cmd: 'ping', args: [] },
  },
  {
    name: 'bare word returns null',
    input: ['banana', '.'],
    expected: null,
  },
  {
    name: 'wrong prefix returns null',
    input: ['/wcg start', '.'],
    expected: null,
  },
  {
    name: 'lone period returns null',
    input: ['.', '.'],
    expected: null,
  },
  {
    name: 'prefix with no text returns null',
    input: ['.   ', '.'],
    expected: null,
  },
  {
    name: 'custom prefix',
    input: ['!hello world', '!'],
    expected: { cmd: 'hello', args: ['world'] },
  },
];

const adminTests = [
  {
    name: 'toNumber: plain JID',
    input: '2349137123224@s.whatsapp.net',
    fn: 'toNumber',
    expected: '2349137123224',
  },
  {
    name: 'toNumber: lid JID',
    input: '2349137123224@lid',
    fn: 'toNumber',
    expected: '2349137123224',
  },
  {
    name: 'toNumber: device-suffixed JID',
    input: '2349137123224:12@s.whatsapp.net',
    fn: 'toNumber',
    expected: '2349137123224',
  },
  {
    name: 'isPhoneJid: @s.whatsapp.net returns true',
    input: '2349137123224@s.whatsapp.net',
    fn: 'isPhoneJid',
    expected: true,
  },
  {
    name: 'isPhoneJid: @lid returns false',
    input: '2349137123224@lid',
    fn: 'isPhoneJid',
    expected: false,
  },
  {
    name: 'isPhoneJid: bare number returns true',
    input: '2349137123224',
    fn: 'isPhoneJid',
    expected: true,
  },
  {
    name: 'isPhoneJid: device-suffix @s.whatsapp.net returns true',
    input: '2349137123224:12@s.whatsapp.net',
    fn: 'isPhoneJid',
    expected: true,
  },
  {
    name: 'isPhoneJid: device-suffix @lid returns false',
    input: '2349137123224:12@lid',
    fn: 'isPhoneJid',
    expected: false,
  },
  {
    name: 'isAdmin: owner match',
    input: { sender: '9876543210@s.whatsapp.net', isGroup: false, groupAdmins: undefined },
    fn: 'isAdmin',
    expected: true,
  },
  {
    name: 'isAdmin: admin in ADMINS',
    input: { sender: '1111111111@s.whatsapp.net', isGroup: false, groupAdmins: undefined },
    fn: 'isAdmin',
    expected: true,
  },
  {
    name: 'isAdmin: group admin match',
    input: { sender: '5555555555@s.whatsapp.net', isGroup: true, groupAdmins: ['5555555555@s.whatsapp.net', '6666666666@s.whatsapp.net'] },
    fn: 'isAdmin',
    expected: true,
  },
  {
    name: 'isAdmin: non-admin in group',
    input: { sender: '7777777777@s.whatsapp.net', isGroup: true, groupAdmins: ['5555555555@s.whatsapp.net'] },
    fn: 'isAdmin',
    expected: false,
  },
  {
    name: 'isAdmin: non-admin in DM',
    input: { sender: '7777777777@s.whatsapp.net', isGroup: false, groupAdmins: undefined },
    fn: 'isAdmin',
    expected: false,
  },
  {
    name: 'isAdmin: groupAdmins null treated as empty',
    input: { sender: '7777777777@s.whatsapp.net', isGroup: true, groupAdmins: null },
    fn: 'isAdmin',
    expected: false,
  },
  {
    name: 'isAdmin: @lid sender matching OWNER digits returns false (security)',
    input: { sender: '9876543210@lid', isGroup: false, groupAdmins: undefined },
    fn: 'isAdmin',
    expected: false,
  },
  {
    name: 'isAdmin: @lid sender matching OWNER in groupAdmins returns true (same-namespace)',
    input: { sender: '9876543210@lid', isGroup: true, groupAdmins: ['9876543210@lid'] },
    fn: 'isAdmin',
    expected: true,
  },
  {
    name: 'isAdminEither: owner matched via senderPn while sender is @lid',
    input: {
      sender: '177769082306562@lid',
      senderPn: '9876543210@s.whatsapp.net',
      isGroup: true,
      groupAdmins: [],
    },
    fn: 'isAdminEither',
    expected: true,
  },
  {
    name: 'isAdminEither: group admin matched via lid sender, senderPn absent',
    input: {
      sender: '177769082306562@lid',
      senderPn: undefined,
      isGroup: true,
      groupAdmins: ['177769082306562@lid'],
    },
    fn: 'isAdminEither',
    expected: true,
  },
  {
    name: 'isAdminEither: non-admin with both forms present returns false',
    input: {
      sender: '177769082306562@lid',
      senderPn: '7777777777@s.whatsapp.net',
      isGroup: true,
      groupAdmins: ['5555555555@lid'],
    },
    fn: 'isAdminEither',
    expected: false,
  },
  {
    name: 'isAdminEither: both forms undefined returns false',
    input: { sender: undefined, senderPn: undefined, isGroup: true, groupAdmins: [] },
    fn: 'isAdminEither',
    expected: false,
  },
];

const waTests = [
  {
    name: 'shouldSkip: fromMe message we sent is skipped',
    fn: () => shouldSkip({ fromMe: true, id: 'ABC' }, new Set(['ABC', 'XYZ'])),
    expected: true,
  },
  {
    name: 'shouldSkip: fromMe message we did NOT send is processed',
    fn: () => shouldSkip({ fromMe: true, id: 'OWNER1' }, new Set(['ABC', 'XYZ'])),
    expected: false,
  },
  {
    name: 'shouldSkip: normal inbound (not fromMe) message is processed',
    fn: () => shouldSkip({ fromMe: false, id: 'ABC' }, new Set(['ABC', 'XYZ'])),
    expected: false,
  },
  {
    name: 'shouldSkip: fromMe with no id is processed',
    fn: () => shouldSkip({ fromMe: true, id: undefined }, new Set(['ABC'])),
    expected: false,
  },
  {
    name: 'resolveSender: group message (participant present) uses participant regardless of fromMe',
    fn: () => resolveSender({ fromMe: true, participant: '123@lid' }, '999@g.us', '456@s.whatsapp.net'),
    expected: '123@lid',
  },
  {
    name: 'resolveSender: fromMe DM (no participant) falls back to own JID, not the chat JID',
    fn: () => resolveSender({ fromMe: true, participant: undefined }, '999@s.whatsapp.net', '456@s.whatsapp.net'),
    expected: '456@s.whatsapp.net',
  },
  {
    name: 'resolveSender: normal inbound DM (no participant, not fromMe) uses jid',
    fn: () => resolveSender({ fromMe: false, participant: undefined }, '999@s.whatsapp.net', '456@s.whatsapp.net'),
    expected: '999@s.whatsapp.net',
  },
  {
    name: 'addSentId: cache evicts oldest once past its cap',
    fn: () => {
      const set = new Set();
      for (let i = 0; i < 5; i++) addSentId(set, `id${i}`, 3);
      return [...set];
    },
    expected: ['id2', 'id3', 'id4'],
  },
  {
    name: 'addSentId: default cap is SENT_ID_CAP (500)',
    fn: () => SENT_ID_CAP,
    expected: 500,
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  const [text, prefix] = test.input;
  let result;
  try {
    result = parseCommand(text, prefix);
    assert.deepEqual(result, test.expected);
    console.log(`✓ ${test.name}`);
    passed++;
  } catch (e) {
    console.error(`✗ ${test.name}: expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`);
    failed++;
  }
}

for (const test of adminTests) {
  let result;
  try {
    if (test.fn === 'toNumber') {
      result = toNumber(test.input);
    } else if (test.fn === 'isPhoneJid') {
      result = isPhoneJid(test.input);
    } else if (test.fn === 'isAdmin') {
      result = isAdmin(test.input);
    } else if (test.fn === 'isAdminEither') {
      result = isAdminEither(test.input);
    }
    assert.deepEqual(result, test.expected);
    console.log(`✓ ${test.name}`);
    passed++;
  } catch (e) {
    console.error(`✗ ${test.name}: expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`);
    failed++;
  }
}

for (const test of waTests) {
  let result;
  try {
    result = test.fn();
    assert.deepEqual(result, test.expected);
    console.log(`✓ ${test.name}`);
    passed++;
  } catch (e) {
    console.error(`✗ ${test.name}: expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
