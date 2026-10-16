// Ugandan mobile numbers and mobile money networks.

export type Network = "mtn" | "airtel";

export const NETWORKS: Record<Network, { label: string; short: string; prefixes: string[] }> = {
  mtn: { label: "MTN MoMo", short: "MTN", prefixes: ["76", "77", "78", "39"] },
  airtel: { label: "Airtel Money", short: "Airtel", prefixes: ["70", "74", "75", "20"] },
};

// Accepts 0772123456, 772123456, +256772123456 or "256 772 123 456".
// Returns the 9 local digits (772123456) or null if it isn't a Ugandan mobile number.
export function normalizeMsisdn(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "")
    .replace(/\D/g, "")
    .replace(/^256/, "")
    .replace(/^0/, "");
  return /^(7\d|20|39)\d{7}$/.test(digits) ? digits : null;
}

export function networkOf(msisdn: string): Network | null {
  const prefix = msisdn.slice(0, 2);
  for (const key of Object.keys(NETWORKS) as Network[]) {
    if (NETWORKS[key].prefixes.includes(prefix)) return key;
  }
  return null;
}

// 772123456 -> "0772 123 456"
export function prettyMsisdn(msisdn: string): string {
  return `0${msisdn.slice(0, 3)} ${msisdn.slice(3, 6)} ${msisdn.slice(6)}`;
}

// 772123456 -> "+256772123456" (what payment and SMS providers want)
export function internationalMsisdn(msisdn: string): string {
  return `+256${msisdn}`;
}

// Checks a number against the chosen mobile money network.
// Returns an error message, or "" when it's fine.
export function mobileMoneyError(method: Network, raw: string): string {
  const msisdn = normalizeMsisdn(raw);
  if (!msisdn) return "Enter a valid Ugandan mobile number, like 0772 123 456.";
  const net = networkOf(msisdn);
  if (net === method) return "";
  const want = NETWORKS[method].short;
  if (net) return `${prettyMsisdn(msisdn)} is on ${NETWORKS[net].label}. Pick ${NETWORKS[net].label} above, or enter an ${want} number.`;
  return `${prettyMsisdn(msisdn)} isn't on ${NETWORKS[method].label}. Enter an ${want} number.`;
}
