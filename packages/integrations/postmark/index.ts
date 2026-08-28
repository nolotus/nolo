export interface PostmarkEmailOptions {
    from?: string;
    to: string;
    subject: string;
    textBody?: string;
    htmlBody?: string;
    tag?: string;
}

export async function sendEmail({
    from,
    to,
    subject,
    textBody,
    htmlBody,
    tag,
}: PostmarkEmailOptions) {
    const serverToken = process.env.POSTMARK_SERVER_TOKEN;
    const defaultFrom = process.env.POSTMARK_FROM_EMAIL;

    if (!serverToken) {
        throw new Error("POSTMARK_SERVER_TOKEN is not defined");
    }

    const sender = from || defaultFrom;
    if (!sender) {
        throw new Error("Sender email (From) is not defined");
    }

    const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": serverToken,
        },
        body: JSON.stringify({
            From: sender,
            To: to,
            Subject: subject,
            TextBody: textBody,
            HtmlBody: htmlBody,
            Tag: tag,
        }),
    });

    const result: any = await response.json();

    if (!response.ok) {
        throw new Error(
            `Postmark error: ${result.Message || "Unknown error"} (ErrorCode: ${result.ErrorCode
            })`
        );
    }

    return result;
}
