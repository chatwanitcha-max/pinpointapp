#!/usr/bin/env node

import { request } from "node:https";

const urls = [
  "https://pinpointaccountingservice.com/",
  "https://pinpointaccountingservice.com/blog",
  "https://pinpointaccountingservice.com/robots.txt",
  "https://pinpointaccountingservice.com/llms.txt",
];

function head(url) {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "HEAD" }, (res) => {
      res.resume();
      resolve({
        url,
        statusCode: res.statusCode ?? 0,
        location: res.headers.location ?? "",
      });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error(`Timeout while requesting ${url}`));
    });
    req.on("error", reject);
    req.end();
  });
}

const results = [];
let failed = false;

for (const url of urls) {
  try {
    const result = await head(url);
    results.push(result);
    if (result.statusCode < 200 || result.statusCode >= 400) {
      failed = true;
    }
  } catch (error) {
    failed = true;
    results.push({
      url,
      statusCode: 0,
      location: "",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

for (const result of results) {
  const extra = result.location ? ` -> ${result.location}` : "";
  const err = result.error ? ` (${result.error})` : "";
  console.log(`${result.statusCode} ${result.url}${extra}${err}`);
}

if (failed) {
  process.exitCode = 1;
}
