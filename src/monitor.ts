import { sendSms, logger } from "./send";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Site {
  url: string;
  name: string;
  /** Number of consecutive failures before sending an alert */
  failThreshold: number;
  /** Max alert SMSes to send per outage (alerts stop until site recovers) */
  maxAlerts: number;
  tels: string[];
}

export interface SiteState {
  failCount: number;   // consecutive failures
  alertsSent: number;  // alerts sent for the current outage
}

// ─── Core check logic ─────────────────────────────────────────────────────────

export async function checkSite(site: Site, state: SiteState): Promise<void> {
  const { url, name, tels, failThreshold, maxAlerts } = site;

  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    // ---- Site is UP ----
    const wasDown = state.alertsSent > 0;
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    logger.info(`✅ ${url}  UP  [${now}]`);

    if (wasDown) {
      await sendSms(tels.join(","), name, "success");
    }

    state.failCount = 0;
    state.alertsSent = 0;
  } catch (err) {
    // ---- Site is DOWN ----
    state.failCount++;
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    logger.warn(`❌ ${url}  DOWN  failures=${state.failCount}  [${now}]  reason=${String(err)}`);

    if (state.failCount >= failThreshold && state.alertsSent < maxAlerts) {
      logger.info(`Sending alert SMS → ${tels.join(",")}  (alert #${state.alertsSent + 1})`);
      const sent = await sendSms(tels.join(","), name, "error");
      if (sent) {
        state.alertsSent++;
        state.failCount = 0;
      }
    }
  }
}
