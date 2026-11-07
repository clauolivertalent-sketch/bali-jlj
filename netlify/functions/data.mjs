// Funció de Netlify que guarda les dades del viatge (compartides entre les tres)
// Fa servir Netlify Blobs: gratuït i no cal configurar res.
import { getStore } from "@netlify/blobs";

const KEYS = ["vols", "allotjament", "asseguranca", "despeses", "checklist", "recos", "config"];

function applyOp(cur, op) {
  if (op.op === "set") return op.value;
  const arr = Array.isArray(cur) ? cur.slice() : [];
  if (op.op === "upsert" && op.item && op.item.id) {
    const i = arr.findIndex((x) => x.id === op.item.id);
    if (i >= 0) arr[i] = op.item;
    else arr.push(op.item);
    return arr;
  }
  if (op.op === "delete") return arr.filter((x) => x.id !== op.id);
  return cur;
}

export default async (req) => {
  const store = getStore({ name: "bali-viatge", consistency: "strong" });

  if (req.method === "GET") {
    const out = {};
    await Promise.all(
      KEYS.map(async (k) => {
        out[k] = await store.get(k, { type: "json" });
      })
    );
    return Response.json(out, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("JSON invàlid", { status: 400 });
    }
    if (!KEYS.includes(body.key)) return new Response("Clau no vàlida", { status: 400 });
    const cur = await store.get(body.key, { type: "json" });
    const next = applyOp(cur, body);
    await store.setJSON(body.key, next);
    return Response.json(next, { headers: { "cache-control": "no-store" } });
  }

  return new Response("Mètode no permès", { status: 405 });
};

export const config = { path: "/api/data" };
