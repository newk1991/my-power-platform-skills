// Pure unit tests (no network). Run with: npm run build && npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFlowKey, makeFlowKey } from "../build/regions.js";

test("makeFlowKey joins env and flow with a dot", () => {
  assert.equal(makeFlowKey("env1", "flowA"), "env1.flowA");
});

test("parseFlowKey splits on the FIRST dot only", () => {
  // Flow GUIDs never contain dots, but environment ids and the key format do —
  // splitting on the first dot keeps any later dots with the flow id.
  assert.deepEqual(parseFlowKey("3991358a-f603-e49d-b1ed-a9e4f72e2dcb.0757041a-8ef2"), {
    environmentName: "3991358a-f603-e49d-b1ed-a9e4f72e2dcb",
    flowName: "0757041a-8ef2",
  });
});

test("parseFlowKey is defensive when there is no dot", () => {
  assert.deepEqual(parseFlowKey("just-a-flow"), { environmentName: "", flowName: "just-a-flow" });
});

test("makeFlowKey / parseFlowKey round-trip", () => {
  const env = "Default-d7bf8bae-4d7e-479c-bde4-1103d9e4136c";
  const flow = "2bef03c3-874d-dd0f-0e7d-52eec4a8de0b";
  assert.deepEqual(parseFlowKey(makeFlowKey(env, flow)), { environmentName: env, flowName: flow });
});
