import { randomBytes } from "node:crypto";

const MAX_UUID_V7_TIMESTAMP = 0xffff_ffff_ffff;
const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Creates an RFC 9562 UUIDv7 with an application-side clock and CSPRNG. */
export function createUuidV7(timestamp = Date.now()): string {
  if (!Number.isInteger(timestamp) || timestamp < 0 || timestamp > MAX_UUID_V7_TIMESTAMP) {
    throw new RangeError("UUIDv7 timestamp must be an integer between 0 and 281474976710655");
  }

  const bytes = randomBytes(16);
  let remainingTimestamp = BigInt(timestamp);
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(remainingTimestamp & 0xffn);
    remainingTimestamp >>= 8n;
  }

  bytes[6] = 0x70 | (bytes[6]! & 0x0f);
  bytes[8] = 0x80 | (bytes[8]! & 0x3f);

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Returns true only for a structurally valid RFC 9562 UUIDv7 string. */
export function isUuidV7(value: unknown): value is string {
  return typeof value === "string" && UUID_V7_PATTERN.test(value);
}
