import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "metadata.azure.com",
  "169.254.169.254",
]);

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function isInRange(ip: number, start: number, end: number): boolean {
  return ip >= start && ip <= end;
}

function isBlockedIPv4(ip: string): boolean {
  const num = ipToNumber(ip);

  // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
  if (isInRange(num, 0x0a000000, 0x0affffff)) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (isInRange(num, 0xac100000, 0xac1fffff)) return true;

  // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
  if (isInRange(num, 0xc0a80000, 0xc0a8ffff)) return true;

  // 127.0.0.0/8 (loopback)
  if (isInRange(num, 0x7f000000, 0x7fffffff)) return true;

  // 169.254.0.0/16 (link-local)
  if (isInRange(num, 0xa9fe0000, 0xa9feffff)) return true;

  // 100.64.0.0/10 (CGNAT)
  if (isInRange(num, 0x64400000, 0x647fffff)) return true;

  // 0.0.0.0/8 (current network)
  if (isInRange(num, 0x00000000, 0x00ffffff)) return true;

  // 224.0.0.0/4 (multicast)
  if (isInRange(num, 0xe0000000, 0xefffffff)) return true;

  // 240.0.0.0/4 (reserved)
  if (isInRange(num, 0xf0000000, 0xffffffff)) return true;

  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 (loopback)
  if (normalized === "::1") return true;

  // :: (unspecified)
  if (normalized === "::") return true;

  // ::ffff:x.x.x.x (IPv4-mapped) - check the IPv4 part
  if (normalized.startsWith("::ffff:")) {
    const ipv4Part = normalized.slice(7);
    if (net.isIPv4(ipv4Part) && isBlockedIPv4(ipv4Part)) return true;
  }

  // fe80::/10 (link-local)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
      normalized.startsWith("fea") || normalized.startsWith("feb")) return true;

  // fc00::/7 (unique local address)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // ff00::/8 (multicast)
  if (normalized.startsWith("ff")) return true;

  return false;
}

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isBlockedIPv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isBlockedIPv6(ip);
  }
  return true;
}

export async function validateOutboundWebhookUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (url.protocol !== "https:") {
    throw new Error("Webhook URL must be HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("Webhook URL must not include credentials");
  }

  const hostname = normalizeHostname(url.hostname);

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("Blocked hostname");
  }

  // Check if hostname is already an IP address
  const ipKind = net.isIP(hostname);
  if (ipKind) {
    if (isBlockedIp(hostname)) {
      throw new Error("Blocked IP address");
    }
    return url;
  }

  // Block numeric hostname tricks (decimal/octal/hex IP encodings)
  if (/^\d+$/.test(hostname)) {
    throw new Error("Numeric hostname not allowed");
  }

  // Block octal notation (e.g., 0177.0.0.1)
  if (/^0\d/.test(hostname.split(".")[0] ?? "")) {
    throw new Error("Octal hostname notation not allowed");
  }

  // Resolve hostname and check all IPs
  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Hostname does not resolve");
  }

  if (!addrs.length) {
    throw new Error("Hostname does not resolve");
  }

  for (const addr of addrs) {
    if (isBlockedIp(addr.address)) {
      throw new Error("Hostname resolves to blocked IP");
    }
  }

  return url;
}
