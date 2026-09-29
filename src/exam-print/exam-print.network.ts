/**
 * Hosts the print pages may load from besides the bucket: KaTeX assets and
 * the web fonts referenced by the templates (see KATEX_HEAD).
 */
export const PRINT_ALLOWED_HOSTS: readonly string[] = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

/**
 * Whether the headless browser may fetch `rawUrl` while rendering a print
 * document. Question text and image URLs come from user-authored data, so
 * everything not explicitly listed — internal addresses, cloud metadata
 * endpoints, arbitrary sites — is refused, which also stops the page from
 * being used as a server-side request proxy.
 *
 * Allowed: `data:` URLs, and HTTPS requests to `PRINT_ALLOWED_HOSTS` or to
 * one of `extraHosts` (the storage bucket).
 */
export function isAllowedPrintRequest(
  rawUrl: string,
  extraHosts: readonly string[],
): boolean {
  if (rawUrl.startsWith('data:')) return true;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return (
    PRINT_ALLOWED_HOSTS.includes(host) ||
    extraHosts.some((allowed) => allowed.toLowerCase() === host)
  );
}
