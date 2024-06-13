import { KdbxEntry } from "kdbxweb";
import { OtpObject } from "../pages/Home";

export function recordEntity(entity: OtpObject, entry: KdbxEntry) {
  entry.fields.set("label", entity.label);
  entry.fields.set("issuer", entity.issuer);
  entry.fields.set("secret", entity.secret);
  entry.fields.set("digits", entity.digits.toString());
  entry.fields.set("counter", entity.counter.toString());
  entry.fields.set("period", entity.period.toString());
  entry.fields.set("id", entity.id);

  entity.color && entry.fields.set("color", entity.color);
  entity.otp && entry.fields.set("otp", entity.otp);
  entity.icon && entry.fields.set("icon", entity.icon);

  entry.fields.set("algorithm", entity.algorithm);

  entry.times.update();
}
