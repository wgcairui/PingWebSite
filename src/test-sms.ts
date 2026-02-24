/**
 * Quick smoke test – sends an error-type SMS to 15337364316.
 * Run with:  bun run src/test-sms.ts
 */
import { sendSms } from "./send";

console.log("Sending test SMS to 15337364316 …");

const ok = await sendSms("15337364316", "测试站点", "error");

if (ok) {
  console.log("✅ SMS sent successfully");
} else {
  console.error("❌ SMS failed – check the log for details");
  process.exit(1);
}
