const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

interface SendEmailOptions {
  email: string;
  templateId: string;
  data?: Record<string, any>; // dynamic template data
}

const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const msg = {
    personalizations: [
      {
        to: [{ email: options.email }],
        dynamic_template_data: options.data,
      },
    ],
    from: { email: process.env.SENDGRID_MAIL as string },
    template_id: options.templateId,
  };

  try {
    const response = await fetch(SENDGRID_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msg),
    });

    if (!response.ok) {
      throw new Error(`SendGrid responded ${response.status}: ${await response.text()}`);
    }

    console.log("Email Sent");
  } catch (error: any) {
    console.error("SendGrid Error:", error.message || error);
    throw new Error(error.message || "Email could not be sent");
  }
};

export default sendEmail;
