import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, subject, message } = body;

    // 1. Validation
    if (!name?.trim() || !phone?.trim() || !message?.trim()) {
      return NextResponse.json(
        {
          isSuccess: false,
          error: "Full name, phone number, and message are required.",
        },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email?.trim() || null;
    const cleanSubject = subject?.trim() || null;
    const cleanMessage = message.trim();

    // 2. Save inquiry to Database via Prisma
    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        status: "unread",
      },
    });

    // 3. Send email notification to support@arzamart.com
    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.CONTACT_NOTIFICATION_EMAIL || "support@arzamart.com";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: `Arza Contact Form <${fromEmail}>`,
          to: recipientEmail,
          subject: cleanSubject
            ? `[Contact Form] ${cleanSubject} - ${cleanName}`
            : `New Contact Inquiry from ${cleanName} (${cleanPhone})`,
          replyTo: cleanEmail || undefined,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
              <h2 style="color: #c23a22; border-bottom: 2px solid #c23a22; padding-bottom: 10px;">New Contact Message Received</h2>
              <p style="font-size: 14px; color: #555;">You have received a new inquiry from the Arzamart website contact form.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 140px; color: #333;">Inquiry ID:</td><td style="padding: 8px 0; color: #666;">${inquiry.id}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Customer Name:</td><td style="padding: 8px 0; color: #111;">${cleanName}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Phone Number:</td><td style="padding: 8px 0; color: #111;">${cleanPhone}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Email Address:</td><td style="padding: 8px 0; color: #111;">${cleanEmail || "Not provided"}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Subject / Order ID:</td><td style="padding: 8px 0; color: #111;">${cleanSubject || "General Inquiry"}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #333; vertical-align: top;">Message:</td><td style="padding: 8px 0; color: #111; white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 6px;">${cleanMessage}</td></tr>
              </table>
              <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">Submitted from arzamart.com contact form.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Resend email notification failed:", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY is not set. Inquiry saved to database; email notification skipped.");
    }

    return NextResponse.json({
      isSuccess: true,
      data: { id: inquiry.id },
      message: "Your message has been received! Our support team will contact you shortly.",
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json({
      isSuccess: false,
      error: error instanceof Error ? error.message : "Failed to submit contact message",
    }, { status: 500 });
  }
}
