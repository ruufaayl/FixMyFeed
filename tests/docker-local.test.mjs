/**
 * Docker-local dependency environment acceptance tests (task T005).
 *
 * These tests intentionally use only Node.js so the local infrastructure
 * contract can be checked even when Docker is unavailable on the test host.
 * Runtime startup remains a separate, documented acceptance check.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const composeUrl = new URL("../compose.yaml", import.meta.url);
const runbookUrl = new URL("../docker/README.md", import.meta.url);

const requiredImages = [
  "postgres:17.10-alpine3.23",
  "chrislusf/seaweedfs:4.29",
  "axllent/mailpit:v1.30.0",
];

const requiredLoopbackPorts = [
  "127.0.0.1:5432:5432",
  "127.0.0.1:8333:8333",
  "127.0.0.1:1025:1025",
  "127.0.0.1:8025:8025",
];

function validateComposeContract(source) {
  const errors = [];

  for (const service of ["postgres", "object-storage", "mailpit"]) {
    if (!new RegExp(`^  ${service}:$`, "m").test(source)) {
      errors.push(`missing service: ${service}`);
    }
  }

  for (const image of requiredImages) {
    if (!source.includes(`image: ${image}`)) {
      errors.push(`missing pinned image: ${image}`);
    }
  }

  if (/image:\s+\S+:(?:latest|edge)\b/.test(source)) {
    errors.push("floating image tag is prohibited");
  }

  for (const port of requiredLoopbackPorts) {
    if (!source.includes(`"${port}"`)) {
      errors.push(`missing loopback port: ${port}`);
    }
  }

  const publishedPorts = [...source.matchAll(/^\s+-\s+"([^"]+:\d+)"\s*$/gm)].map(
    ([, mapping]) => mapping,
  );
  if (publishedPorts.some((mapping) => !mapping.startsWith("127.0.0.1:"))) {
    errors.push("all published ports must bind to 127.0.0.1");
  }

  for (const variable of [
    "FIXMYFEED_POSTGRES_PASSWORD",
    "OBJECT_STORAGE_ACCESS_KEY",
    "OBJECT_STORAGE_SECRET_KEY",
  ]) {
    if (!source.includes(`\${${variable}:?`)) {
      errors.push(`secret input must be required: ${variable}`);
    }
  }

  for (const volume of ["postgres-data:/var/lib/postgresql/data", "object-storage-data:/data"]) {
    if (!source.includes(volume)) {
      errors.push(`missing persistent volume: ${volume}`);
    }
  }

  if ((source.match(/^\s+healthcheck:$/gm) ?? []).length !== 3) {
    errors.push("each dependency must define a healthcheck");
  }

  if (!source.includes("S3_BUCKET: fixmyfeed-local")) {
    errors.push("the local object-storage bucket must be deterministic");
  }

  if (!source.includes("internal: true")) {
    errors.push("the dependency network must not provide outbound access");
  }

  return errors;
}

test("primary: compose provisions the approved local dependency contract", async () => {
  const compose = await readFile(composeUrl, "utf8");
  assert.deepEqual(validateComposeContract(compose), []);
});

test("primary: runbook documents setup, verification, and destructive reset", async () => {
  const runbook = await readFile(runbookUrl, "utf8");

  for (const requiredText of [
    "docker compose config",
    "docker compose up --detach --wait",
    "docker compose ps",
    "docker compose down --volumes",
    "FIXMYFEED_POSTGRES_PASSWORD",
    "OBJECT_STORAGE_ACCESS_KEY",
    "OBJECT_STORAGE_SECRET_KEY",
  ]) {
    assert.ok(runbook.includes(requiredText), `runbook missing: ${requiredText}`);
  }
});

test("failure: unsafe or incomplete compose configuration is rejected", () => {
  const unsafeCompose = `services:
  postgres:
    image: postgres:latest
    ports:
      - "5432:5432"
`;

  const errors = validateComposeContract(unsafeCompose);
  assert.ok(errors.includes("floating image tag is prohibited"));
  assert.ok(errors.includes("all published ports must bind to 127.0.0.1"));
  assert.ok(errors.includes("missing service: object-storage"));
  assert.ok(errors.includes("secret input must be required: FIXMYFEED_POSTGRES_PASSWORD"));
  assert.ok(errors.includes("each dependency must define a healthcheck"));
});
