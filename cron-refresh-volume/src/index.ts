export interface Env {
  PAGES_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const base = (env.PAGES_URL || "").replace(/\/$/, "");
    if (!base) {
      console.error("PAGES_URL is not set");
      return;
    }
    if (!env.CRON_SECRET) {
      console.error("CRON_SECRET is not set");
      return;
    }
    const url = `${base}/api/admin/refresh-volume`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-Cron-Secret": env.CRON_SECRET },
    });
    if (!res.ok) {
      console.error("refresh-volume failed:", res.status, await res.text());
    }
  },
};
