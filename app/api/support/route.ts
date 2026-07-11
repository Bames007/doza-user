import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import logger from "@/app/utils/logger";

const supportFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(1, "Message is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = supportFormSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({
        message: "Invalid support form submission",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid form data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { name, email, message } = parseResult.data;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Doza Support" <${process.env.SMTP_FROM}>`,
      to: process.env.SUPPORT_EMAIL,
      subject: `Support request from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong><br/>${message}</p>`,
    });

    logger.info({ name, email, message: "Support email sent" });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ message: "Support email failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to send message" },
      { status: 500 },
    );
  }
}
