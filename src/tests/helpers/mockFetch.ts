import { vi } from 'vitest';

/**
 * A tiny router around `global.fetch` for component tests. Each rule is
 * tried in order against the request URL (+ optional method); the first
 * match's `respond` supplies the JSON body (and optional status/ok). Any
 * unmatched call gets a 404-ish empty success body rather than throwing, so
 * a component's unrelated background fetches never crash a test that
 * doesn't care about them.
 */
export type FetchRule = {
  when: RegExp;
  method?: string;
  respond: (url: string, init?: RequestInit) => { status?: number; body: unknown };
};

export function installMockFetch(rules: FetchRule[]) {
  const calls: { url: string; init?: RequestInit }[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    calls.push({ url, init });

    const rule = rules.find(
      (r) => r.when.test(url) && (!r.method || r.method.toUpperCase() === method)
    );

    const { status = 200, body } = rule
      ? rule.respond(url, init)
      : { status: 200, body: { success: true, data: null } };

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });

  vi.stubGlobal('fetch', fetchMock);

  return { fetchMock, calls };
}
