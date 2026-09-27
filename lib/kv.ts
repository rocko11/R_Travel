import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

/**
 * Tiny key-value layer. On Netlify: Netlify Blobs (one store per namespace).
 * Locally: .data/<namespace>.json. Before launch, move to Postgres.
 */
const onNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);

let queue: Promise<unknown> = Promise.resolve();
/** Serialize writes within this server instance. */
export function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

// Separate lock for local file writes, so kvSet can be called inside serial().
let fileQueue: Promise<unknown> = Promise.resolve();
function fileLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = fileQueue.then(fn, fn);
  fileQueue = next.catch(() => undefined);
  return next;
}

const file = (ns: string) => path.join(process.cwd(), ".data", `${ns}.json`);

async function readFile(ns: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(file(ns), "utf8"));
  } catch {
    return {};
  }
}

async function writeFile(ns: string, all: Record<string, unknown>) {
  await fs.mkdir(path.dirname(file(ns)), { recursive: true });
  const tmp = `${file(ns)}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(all, null, 2));
  await fs.rename(tmp, file(ns));
}

export async function kvGet<T>(ns: string, key: string): Promise<T | null> {
  if (onNetlify) {
    return ((await getStore({ name: ns, consistency: "strong" }).get(key, { type: "json" })) as T | null) ?? null;
  }
  const all = await readFile(ns);
  return (all[key] as T) ?? null;
}

export async function kvSet<T>(ns: string, key: string, value: T): Promise<void> {
  if (onNetlify) {
    await getStore({ name: ns, consistency: "strong" }).setJSON(key, value);
    return;
  }
  await fileLock(async () => {
    const all = await readFile(ns);
    all[key] = value;
    await writeFile(ns, all);
  });
}
