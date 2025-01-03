import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = 'onboarding@resend.dev'

interface EmailRequest {
  to: string
  subject: string
  template: string
  data: {
    name: string
    status: string
    teamName?: string
  }
}

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`

const headerStyle = `
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 20px;
  border-radius: 8px 8px 0 0;
  text-align: center;
  margin: -20px -20px 20px -20px;
`

const buttonStyle = `
  display: inline-block;
  background: #3b82f6;
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  margin: 20px 0;
`

const footerStyle = `
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
`

const templates = {
  test: (data: EmailRequest['data']) => ({
    subject: 'Test Email from DevImpact',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="margin: 0; font-size: 24px;">Test Email</h1>
        </div>
        <h2 style="color: #1f2937; margin-bottom: 16px;">Hello ${data.name}! 👋</h2>
        <p style="color: #374151; line-height: 1.6;">This is a test email to verify the email functionality is working correctly.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #374151; margin: 0;">Email details:</p>
          <ul style="color: #374151; margin: 10px 0;">
            <li>Sent from: ${FROM_EMAIL}</li>
            <li>Template: Test template</li>
            <li>Time: ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        <div style="${footerStyle}">
          <p>Best regards,<br>The DevImpact Team</p>
          <p style="font-size: 12px; color: #9ca3af;">NCS Club - DevImpact Hackathon 2024</p>
        </div>
      </div>
    `
  }),
  approved: (data: EmailRequest['data']) => ({
    subject: 'Your DevImpact Hackathon Registration is Approved! 🎉',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="margin: 0; font-size: 24px;">Welcome to DevImpact!</h1>
        </div>
        <h2 style="color: #1f2937; margin-bottom: 16px;">Hello ${data.name}! 👋</h2>
        <p style="color: #374151; line-height: 1.6;">Great news! Your registration for the DevImpact Hackathon has been approved.</p>
        ${data.teamName ? `
          <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #374151; margin: 0;">You are part of team <strong>"${data.teamName}"</strong></p>
          </div>
        ` : ''}
        <p style="color: #374151; line-height: 1.6;">Get ready for an amazing experience! Here's what's next:</p>
        <ul style="color: #374151; line-height: 1.6;">
          <li>Join our Discord community</li>
          <li>Complete your team profile</li>
          <li>Start brainstorming project ideas</li>
        </ul>
        <a href="https://devimpact.vercel.app/dashboard" style="${buttonStyle}">Access Dashboard</a>
        <div style="${footerStyle}">
          <p>Best regards,<br>The DevImpact Team</p>
          <p style="font-size: 12px; color: #9ca3af;">NCS Club - DevImpact Hackathon 2024</p>
        </div>
      </div>
    `
  }),
  rejected: (data: EmailRequest['data']) => ({
    subject: 'Update on Your DevImpact Hackathon Registration',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="margin: 0; font-size: 24px;">DevImpact Hackathon</h1>
        </div>
        <h2 style="color: #1f2937; margin-bottom: 16px;">Hello ${data.name}</h2>
        <p style="color: #374151; line-height: 1.6;">Thank you for your interest in the DevImpact Hackathon.</p>
        <p style="color: #374151; line-height: 1.6;">Unfortunately, we are unable to accept your registration at this time.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #374151; margin: 0;">We encourage you to:</p>
          <ul style="color: #374151; margin: 10px 0;">
            <li>Follow us on social media for future events</li>
            <li>Join our Discord community</li>
            <li>Apply again for our next hackathon</li>
          </ul>
        </div>
        <div style="${footerStyle}">
          <p>Best regards,<br>The DevImpact Team</p>
          <p style="font-size: 12px; color: #9ca3af;">NCS Club - DevImpact Hackathon 2024</p>
        </div>
      </div>
    `
  }),
  removed: (data: EmailRequest['data']) => ({
    subject: 'Update on Your DevImpact Hackathon Team Status',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="margin: 0; font-size: 24px;">Team Update</h1>
        </div>
        <h2 style="color: #1f2937; margin-bottom: 16px;">Hello ${data.name}</h2>
        <p style="color: #374151; line-height: 1.6;">This email is to inform you that you have been removed from team "${data.teamName}".</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #374151; margin: 0;">What's next?</p>
          <ul style="color: #374151; margin: 10px 0;">
            <li>Your registration status has been reset to pending</li>
            <li>You can now join another team</li>
            <li>Or wait to be assigned to one</li>
          </ul>
        </div>
        <p style="color: #374151; line-height: 1.6;">If you have any questions, please don't hesitate to contact the organizers.</p>
        <a href="https://devimpact.vercel.app/dashboard" style="${buttonStyle}">View Dashboard</a>
        <div style="${footerStyle}">
          <p>Best regards,<br>The DevImpact Team</p>
          <p style="font-size: 12px; color: #9ca3af;">NCS Club - DevImpact Hackathon 2024</p>
        </div>
      </div>
    `
  })
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, template, data } = await req.json() as EmailRequest

    if (!to || !template || !data) {
      throw new Error('Missing required fields')
    }

    const emailTemplate = templates[template as keyof typeof templates]
    if (!emailTemplate) {
      throw new Error('Invalid template')
    }

    const { subject, html } = emailTemplate(data)

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email');
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
}) 