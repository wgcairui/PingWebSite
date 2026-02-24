import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import config from "./config.json";

// ─── Logger ──────────────────────────────────────────────────────────────────

const LOG_FILE = path.join(import.meta.dir, "../app.log");

function timestamp(): string {
  return new Date()
    .toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "-");
}

function writeLog(level: "INFO" | "WARN" | "ERROR", message: string): void {
  const line = `[${timestamp()}] [${level}] ${message}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_FILE, line, "utf-8");
}

export const logger = {
  info: (msg: string) => writeLog("INFO", msg),
  warn: (msg: string) => writeLog("WARN", msg),
  error: (msg: string) => writeLog("ERROR", msg),
};

// ─── Aliyun SMS (native fetch, HMAC-SHA1 signed request) ─────────────────────
// Aliyun OpenAPI docs: https://api.aliyun.com/#/?product=Dysmsapi&version=2017-05-25

const ENDPOINT = "https://dysmsapi.aliyuncs.com";
const API_VERSION = "2017-05-25";
const SIGN_NAME = "雷迪司科技湖北有限公司";
const SMS_CODES = {
  success: "SMS_185846200",
  error: "SMS_185820818",
} as const;

type AlarmType = keyof typeof SMS_CODES;

interface SmsResult {
  Code: string;
  Message: string;
  RequestId: string;
  BizId?: string;
}

/** Percent-encode a string per RFC 3986 */
function rfc3986Encode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

/** Build Aliyun-style HMAC-SHA1 signature */
function sign(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986Encode(k)}=${rfc3986Encode(params[k])}`)
    .join("&");
  const stringToSign = `POST&${rfc3986Encode("/")}&${rfc3986Encode(sorted)}`;
  const hmac = crypto.createHmac("sha1", `${secret}&`);
  hmac.update(stringToSign);
  return hmac.digest("base64");
}

/** Call an Aliyun SMS API action */
async function callSmsApi(
  action: string,
  extra: Record<string, string>
): Promise<SmsResult> {
  const nonce = crypto.randomBytes(16).toString("hex");
  const ts = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  const params: Record<string, string> = {
    Action: action,
    Version: API_VERSION,
    Format: "JSON",
    SignatureMethod: "HMAC-SHA1",
    SignatureVersion: "1.0",
    SignatureNonce: nonce,
    Timestamp: ts,
    AccessKeyId: config.accessKeyId,
    RegionId: "cn-hangzhou",
    ...extra,
  };

  params.Signature = sign(params, config.accessKeySecret);

  const body = new URLSearchParams(params).toString();

  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  }

  return resp.json() as Promise<SmsResult>;
}

/**
 * Send an SMS alert.
 * @returns true if Aliyun accepted the message (Code === "OK")
 */
export async function sendSms(
  tels: string,
  sitename: string,
  type: AlarmType
): Promise<boolean> {
  const now = new Date();
  const dateStr = now
    .toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "-");

  const templateParam = JSON.stringify({
    sitename: `[${sitename}]`,
    time: dateStr,
  });

  const params = {
    PhoneNumbers: tels,
    SignName: SIGN_NAME,
    TemplateCode: SMS_CODES[type],
    TemplateParam: templateParam,
  };

  logger.info(`Sending SMS [${type}] → ${tels}  param=${templateParam}`);

  try {
    const result = await callSmsApi("SendSms", params);
    logger.info(`SMS result: ${JSON.stringify(result)}`);

    if (result.Code === "OK") {
      return true;
    }
    logger.warn(`SMS not accepted: ${JSON.stringify(result)}`);
    return false;
  } catch (err) {
    logger.error(`SMS error: ${String(err)}`);
    return false;
  }
}
