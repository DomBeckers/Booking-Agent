import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface BookingEmailData {
  platform: string;
  activityName: string;
  date: string;
  confirmationCode: string;
  amountCharged: number;
  cardLabel: string;
}

export async function sendBookingConfirmation(
  data: BookingEmailData
): Promise<boolean> {
  const to = process.env.NOTIFICATION_EMAIL;
  if (!to || !process.env.SMTP_USER) {
    console.log("[Email] SMTP not configured, skipping notification");
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: `"BC Booking Agent" <${process.env.SMTP_USER}>`,
      to,
      subject: `Booked! ${data.activityName} on ${data.date}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: #16a34a; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">It's Booked! Go Pack the Tent.</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Platform</td><td style="padding: 8px 0; font-weight: 600;">${data.platform}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Activity</td><td style="padding: 8px 0; font-weight: 600;">${data.activityName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0; font-weight: 600;">${data.date}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Confirmation</td><td style="padding: 8px 0; font-weight: 600;">${data.confirmationCode}</td></tr>
              <tr style="border-top: 2px solid #e5e7eb;"><td style="padding: 12px 0; color: #6b7280; font-size: 18px;">Amount Charged</td><td style="padding: 12px 0; font-weight: 700; font-size: 18px; color: #16a34a;">$${data.amountCharged.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Charged to</td><td style="padding: 8px 0;">${data.cardLabel}</td></tr>
            </table>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">BC Family Booking Agent</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}
