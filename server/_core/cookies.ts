// Deliberately NOT importing Express's `Request`/`CookieOptions` types here — in Vercel's
// isolated per-function build, `@types/express` (a devDependency) doesn't always resolve the
// same way it does in a full local `tsc` run, and that mismatch showed up as real build
// failures (`.headers` not found, `CookieOptions` resolving with no keys at all). A minimal,
// self-contained shape sidesteps that whole class of environment-dependent problem — Express's
// real Request/CookieOptions objects satisfy these structurally, so nothing else has to change.
type MinimalRequest = {
  protocol: string;
  headers: { [key: string]: string | string[] | undefined };
};

type SessionCookieOptions = {
  httpOnly: boolean;
  path: string;
  sameSite: "none" | "lax";
  secure: boolean;
  domain?: string;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: MinimalRequest) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList: string[] = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((proto: string) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(req: MinimalRequest): SessionCookieOptions {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  // `SameSite=None` cookies must also be `Secure`, or browsers silently drop the
  // Set-Cookie header entirely (no warning surfaced to the app). That combination is
  // needed for cross-site/iframe embedding over HTTPS (e.g. inside the Manus preview
  // frame), but it means a plain-HTTP request — any local dev server — would never be
  // able to persist a session at all. Fall back to `Lax` there instead, which doesn't
  // require `Secure` and still works fine for a same-origin app.
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
