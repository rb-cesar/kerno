import { describe, expect, it } from "vitest";
import { createEvent, withEventOrigin } from ".";
import { isOwnEvent } from "./types";

describe("origem dos eventos", () => {
  it("createEvent marca a origem só dentro de withEventOrigin (inclusive através de awaits)", async () => {
    const payload = { userId: "u" };
    expect(createEvent("user:joined", "w", payload, "u").origin).toBeUndefined();

    const inside = await withEventOrigin("mcp", async () => {
      await new Promise((r) => setTimeout(r, 1)); // o contexto sobrevive a operações assíncronas
      return createEvent("user:joined", "w", payload, "u");
    });
    expect(inside.origin).toBe("mcp");

    expect(createEvent("user:joined", "w", payload, "u").origin).toBeUndefined(); // e não vaza para fora
  });

  it("execuções concorrentes não misturam origens", async () => {
    const payload = { userId: "u" };
    const [a, b] = await Promise.all([
      withEventOrigin("mcp", async () => {
        await new Promise((r) => setTimeout(r, 5));
        return createEvent("user:joined", "w", payload).origin;
      }),
      (async () => {
        await new Promise((r) => setTimeout(r, 1));
        return createEvent("user:joined", "w", payload).origin;
      })(),
    ]);
    expect(a).toBe("mcp");
    expect(b).toBeUndefined();
  });
});

describe("isOwnEvent", () => {
  it("é eco só quando o usuário é o mesmo E a ação não veio do MCP", () => {
    expect(isOwnEvent({ userId: "eu" }, "eu")).toBe(true);
    expect(isOwnEvent({ userId: "outro" }, "eu")).toBe(false);
    expect(isOwnEvent({}, "eu")).toBe(false); // evento de sistema
    expect(isOwnEvent({ userId: "eu", origin: "mcp" }, "eu")).toBe(false);
  });
});
