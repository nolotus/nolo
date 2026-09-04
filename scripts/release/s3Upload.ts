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

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          authorization,
          "content-type": args.contentType,
          "x-amz-content-sha256": args.payloadHash,
          "x-amz-date": amzDate,
        },
        body: args.body,
      });
      if (response.ok) return;

      const responseText = await response.text();
      const message = `S3 upload failed for ${args.uploadName}: ${response.status} ${responseText}`;
      if (!isRetryableS3UploadStatus(response.status) || attempt === S3_UPLOAD_MAX_ATTEMPTS) {
        throw new Error(message);
      }
      console.warn(
        `[s3-upload] ${message}; retrying (${attempt + 1}/${S3_UPLOAD_MAX_ATTEMPTS})`
      );
    } catch (error) {
      if (!isRetryableS3UploadError(error) || attempt === S3_UPLOAD_MAX_ATTEMPTS) {
        throw error;
      }
      console.warn(
        `[s3-upload] S3 upload failed for ${args.uploadName}: ${toErrorMessage(error)}; retrying (${attempt + 1}/${S3_UPLOAD_MAX_ATTEMPTS})`
      );
    }

    await sleep(S3_UPLOAD_RETRY_BASE_MS * attempt);
  }
}