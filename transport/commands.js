export function parseCommand(text, prefix) {
  const trimmed = text.trim();
  if (!trimmed.startsWith(prefix)) return null;

  const rest = trimmed.slice(prefix.length).trim();
  if (!rest) return null;

  const parts = rest.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  return { cmd, args };
}
