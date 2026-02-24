import { sendSms, logger } from "./send";
import { checkSite } from "./monitor";
import configData from "./config.json";
import type { Site } from "./monitor";

// ─── Quiet hours (Shanghai timezone, 23:00 – 06:00) ──────────────────────────

function isQuietHour(): boolean {
  const shanghaiHour = Number(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Shanghai",
      hour: "numeric",
      hour12: false,
    })
  );
  return shanghaiHour >= 23 || shanghaiHour < 6;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const SITES: Site[] = configData.sites;
const POLL_INTERVAL_MS = 60_000;

function start(): void {
  logger.info(`Starting PingWebSite – monitoring ${SITES.length} site(s)`);

  const states = new Map(
    SITES.map((s) => [s.url, { failCount: 0, alertsSent: 0 }])
  );

  setInterval(async () => {
    if (isQuietHour()) {
      logger.info("⏸  Quiet hours (23:00–06:00 CST) – skipping checks");
      return;
    }
    await Promise.all(SITES.map((site) => checkSite(site, states.get(site.url)!)));
  }, POLL_INTERVAL_MS);

  if (!isQuietHour()) {
    Promise.all(SITES.map((site) => checkSite(site, states.get(site.url)!)));
  } else {
    logger.info("⏸  Started during quiet hours (23:00–06:00 CST) – first check deferred");
  }
}

start();
