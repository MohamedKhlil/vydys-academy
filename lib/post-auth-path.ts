/**
 * Preserve a learner's destination across password, OAuth or email-link auth.
 * Only first-party, student-accessible paths may be restored from a URL query.
 */
const allowedTargets = [
  "/dashboard", "/formations", "/formation", "/practice",
  "/skill-engine", "/hub", "/ai-tutor", "/ai-lab",
  "/auto-learner", "/competences", "/portfolio",
  "/classroom", "/onboarding", "/recherche"
] as const;

export function safeStudentReturnPath(value: string | null | undefined): string {
  if(!value || value.length > 300 || !value.startsWith("/") || value.startsWith("//")) return "";
  if(value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return "";

  const path=value.split(/[?#]/,1)[0];
  if(!path || /(^|\/)\.{1,2}(\/|$)/.test(path)) return "";
  const valid=allowedTargets.some(prefix=>path===prefix || path.startsWith(prefix+"/"));
  if(!valid)return "";

  try {
    const target=new URL(value,"https://www.vydys.com");
    if(target.origin!=="https://www.vydys.com" || target.username || target.password)return "";
    // URL parsing normalizes encoded dot segments, so re-check the final route.
    const normalized=target.pathname;
    if(!allowedTargets.some(prefix=>normalized===prefix || normalized.startsWith(prefix+"/")))return "";
    return normalized + target.search;
  } catch { return "" }
}
