import { createHash, createHmac } from "node:crypto";
import { toErrorMessage } from "core/errorMessage";
import type { DesktopPublishS3Config } from "./desktopReleasePublisher";

export const S3_UPLOAD_MAX_ATTEMPTS = 4;
export const S3_UPLOAD_RETRY_BASE_MS = 2_000;

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function encodeS3Segment(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function resolveS3UploadName(
  config: DesktopPublishS3Config,
  uploadName: string,
) {
  return config.pathPrefix ? `${config.pathPrefix}/${uploadName}` : uploadName;
}

export function buildS3ObjectUrl(
  config: DesktopPublishS3Config,
  uploadName: string,
) {
  const key = resolveS3UploadName(config, uploadName);
  const encodedKey = key.split("/").map(encodeS3Segment).join("/");
  return new URL(
    `${config.endpoint}/${encodeS3Segment(config.bucket)}/${encodedKey}`
  );
}

export function amzDateParts(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

export function hmacSha256(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function signS3Request(args: {
  config: DesktopPublishS3Config;
  method: string;
  url: URL;
  payloadHash: string;
  amzDate: string;
  dateStamp: string;
}) {
  const service = "s3";
  const credentialScope = `${args.dateStamp}/${args.config.region}/${service}/aws4_request`;
  const canonicalHeaders =
    `host:${args.url.host}\n` +
    `x-amz-content-sha256:${args.payloadHash}\n` +
    `x-amz-date:${args.amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    args.method,
    args.url.pathname,
    args.url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    args.payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    args.amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = hmacSha256(
    hmacSha256(
      hmacSha256(
        hmacSha256(`AWS4${args.config.secretAccessKey}`, args.dateStamp),
        args.config.region
      ),
      service
    ),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return `AWS4-HMAC-SHA256 Credential=${args.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

export function isRetryableS3UploadStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export function isRetryableS3UploadError(error: unknown) {
  const message = toErrorMessage(error);
  return /ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|socket|network|connection|fetch failed|closed unexpectedly/i.test(
    message
  );
}

export async function readS3Object(args: {
  config: DesktopPublishS3Config;
  uploadName: string;
  /** 重试退避基数（毫秒）。默认与写入路径一致；测试可传 0 以免拖慢。 */
  retryBaseMs?: number;
}): Promise<string | null> {
  const url = buildS3ObjectUrl(args.config, args.uploadName);
  const payloadHash = sha256Hex("");
  const retryBaseMs = args.retryBaseMs ?? S3_UPLOAD_RETRY_BASE_MS;

  for (let attempt = 1; attempt <= S3_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    const { amzDate, dateStamp } = amzDateParts();
    const authorization = signS3Request({
      config: args.config,
      method: "GET",
      url,
      payloadHash,
      amzDate,
      dateStamp,
    });

    // try 只包住 fetch：HTTP 状态判断必须在 catch 之外，否则一个响应正文里
    // 含 "connection"/"network" 的 4xx（如 Cloudflare 的 "The connection to
    // origin was lost"）会被 isRetryableS3UploadError 误判成网络抖动，把本该
    // 立即失败的请求重试到耗尽。
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          authorization,
          "x-amz-content-sha256": payloadHash,
          "x-amz-date": amzDate,
        },
      });
    } catch (error) {
      if (!isRetryableS3UploadError(error) || attempt === S3_UPLOAD_MAX_ATTEMPTS) {
        throw error;
      }
      console.warn(
        `[s3-read] S3 read failed for ${args.uploadName}: ${toErrorMessage(error)}; retrying (${attempt + 1}/${S3_UPLOAD_MAX_ATTEMPTS})`
      );
      await sleep(retryBaseMs * attempt);
      continue;
    }

    if (response.status === 404) return null;
    if (response.ok) return await response.text();

    const responseText = await response.text();
    const message = `S3 read failed for ${args.uploadName}: ${response.status} ${responseText}`;
    if (!isRetryableS3UploadStatus(response.status) || attempt === S3_UPLOAD_MAX_ATTEMPTS) {
      throw new Error(message);
    }
    console.warn(
      `[s3-read] ${message}; retrying (${attempt + 1}/${S3_UPLOAD_MAX_ATTEMPTS})`
    );

    await sleep(retryBaseMs * attempt);
  }

  throw new Error(`S3 read failed for ${args.uploadName}: exhausted ${S3_UPLOAD_MAX_ATTEMPTS} attempts`);
}

export async function uploadS3Object(args: {
  config: DesktopPublishS3Config;
  uploadName: string;
  body: Blob;
  payloadHash: string;
  contentType: string;
}) {
  const url = buildS3ObjectUrl(args.config, args.uploadName);

  for (let attempt = 1; attempt <= S3_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    const { amzDate, dateStamp } = amzDateParts();
    const authorization = signS3Request({
      config: args.config,
      method: "PUT",
      url,
      payloadHash: args.payloadHash,
      amzDate,
      dateStamp,
    });

    // 与 readS3Object 同理：try 只包住 fetch。HTTP 状态判断必须在 catch 之外，
    // 否则 body 含 "connection"/"network" 的 4xx 会被 isRetryableS3UploadError
    // 误判成网络抖动，把本该立即失败的上传重试到耗尽。
    let response: Response;
    try {
      response = await fetch(url, {
        method: "PUT",
        headers: {
          authorization,
          "content-type": args.contentType,
          "x-amz-content-sha256": args.payloadHash,
          "x-amz-date": amzDate,
        },
        body: args.body,
      });
    } catch (error) {
      if (!isRetryableS3UploadError(error) || attempt === S3_UPLOAD_MAX_ATTEMPTS) {
        throw error;
      }
      console.warn(
        `[s3-upload] S3 upload failed for ${args.uploadName}: ${toErrorMessage(error)}; retrying (${attempt + 1}/${S3_UPLOAD_MAX_ATTEMPTS})`
      );
      await sleep(S3_UPLOAD_RETRY_BASE_MS * attempt);
      continue;
    }

    if (response.ok) return;

    const responseText = await response.text();
    const message = `S3 upload failed for ${args.uploadName}: ${response.status} ${responseText}`;
    if (!isRetryableS3UploadStatus(response.status) || attempt === S3_UPLOAD_MAX_ATTEMPTS) {
      throw new Error(message);
    }
    console.warn(
      `[s3-upload] ${message}; retrying (${attempt + 1}/${S3_UPLOAD_MAX_ATTEMPTS})`
    );

    await sleep(S3_UPLOAD_RETRY_BASE_MS * attempt);
  }
}