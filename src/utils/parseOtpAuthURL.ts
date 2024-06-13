import type { OtpObject } from "../pages/Home";
import { parseURL } from "whatwg-url";

export function parseOTPAuthURL(url: string): OtpObject {
  const whatwgURL = parseURL(url);
  const params = new URLSearchParams(whatwgURL?.query || "");

  const algomap: Record<string, string> = {
    SHA1: "SHA-1",
    SHA256: "SHA-256",
    SHA512: "SHA-512",
  };

  let algorithm = params.get("algorithm") || "SHA1";

  let otpObject: Partial<OtpObject> = {
    label: decodeURIComponent(whatwgURL?.path[0] || ""),
    issuer: params.get("issuer") || "",
    secret: params.get("secret") || "",
    algorithm: algomap[algorithm],
    digits: parseInt(params.get("digits") || "", 10),
    period: parseInt(params.get("period") || "", 10),
    counter: 0,
  };

  if (!otpObject.secret) {
    throw new Error("Invalid OTPAuth URL, missing secret");
  }

  if (!otpObject.label) {
    throw new Error("Invalid OTPAuth URL, missing label");
  }

  if (otpObject.label.includes(":")) {
    const [issuer, label] = otpObject.label.split(":");
    otpObject.issuer = issuer;
    otpObject.label = label;
  }

  return otpObject as OtpObject;
}
