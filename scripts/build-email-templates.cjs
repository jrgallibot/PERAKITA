/**
 * Builds PeraKita branded auth email HTML (table layout + inline CSS for inbox clients).
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../supabase/templates');

function shell({ preview, heading, bodyHtml, buttonLabel, buttonHref, showCode = false }) {
  const button = buttonLabel && buttonHref
    ? `
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 8px;">
                        <tr>
                          <td align="center" bgcolor="#0D9488" style="border-radius: 12px;">
                            <a href="${buttonHref}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none;">${buttonLabel}</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 16px 0 0; font-size: 12px; line-height: 18px; color: #94A3B8;">
                        If the button does not work, copy and paste this link into your browser:<br />
                        <a href="${buttonHref}" style="color: #0D9488; word-break: break-all;">${buttonHref}</a>
                      </p>`
    : '';

  const code = showCode
    ? `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 8px 0 20px;">
                        <tr>
                          <td align="center" style="background: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 16px; padding: 20px;">
                            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #0D9488; text-transform: uppercase;">Verification code</p>
                            <p style="margin: 0; font-family: Consolas, Monaco, monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.18em; color: #0F172A;">{{ .Token }}</p>
                          </td>
                        </tr>
                      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PeraKita</title>
  </head>
  <body style="margin: 0; padding: 0; background: #F8FAFC;">
    <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; color: #F8FAFC;">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #F8FAFC;">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px;">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="40" height="40" align="center" valign="middle" bgcolor="#0D9488" style="border-radius: 14px; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 800; color: #ffffff;">₱</td>
                    <td style="padding-left: 10px; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 800; color: #0F172A;">PeraKita</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background: #ffffff; border: 1px solid #E2E8F0; border-radius: 24px; padding: 32px 28px; font-family: Arial, Helvetica, sans-serif; color: #0F172A;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0D9488;">Personal finance</p>
                <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 30px; font-weight: 800;">${heading}</h1>
                ${bodyHtml}
                ${code}
                ${button}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #94A3B8;">
                PeraKita helps you track money in PHP — expenses, income, and more.<br />
                If you did not expect this email, you can ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

const greeting = `{{ if .Data.display_name }}Hi {{ .Data.display_name }},{{ else }}Hello,{{ end }}`;

const files = {
  'confirmation.html': shell({
    preview: 'Confirm your email to finish setting up PeraKita.',
    heading: 'Confirm your email',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #64748B;">Thanks for joining PeraKita. Confirm <strong style="color:#0F172A;">{{ .Email }}</strong> so you can start tracking expenses, income, and balances in PHP.</p>`,
    buttonLabel: 'Confirm email address',
    buttonHref: '{{ .ConfirmationURL }}',
  }),
  'recovery.html': shell({
    preview: 'Reset your PeraKita password.',
    heading: 'Reset your password',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #64748B;">We received a request to reset the password for <strong style="color:#0F172A;">{{ .Email }}</strong>. Choose a new password using the button below. If you did not request this, you can ignore this email.</p>`,
    buttonLabel: 'Choose a new password',
    buttonHref: '{{ .ConfirmationURL }}',
  }),
  'magic_link.html': shell({
    preview: 'Use this one-time link to sign in to PeraKita.',
    heading: 'Your sign-in link',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #64748B;">Tap the button to sign in to PeraKita. This link expires shortly and can only be used once.</p>`,
    buttonLabel: 'Sign in to PeraKita',
    buttonHref: '{{ .ConfirmationURL }}',
  }),
  'invite.html': shell({
    preview: 'You have been invited to PeraKita.',
    heading: "You're invited to PeraKita",
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #64748B;">Create your account to start tracking money in PHP — offline on your phone, synced when you have internet.</p>`,
    buttonLabel: 'Accept invitation',
    buttonHref: '{{ .ConfirmationURL }}',
  }),
  'email_change.html': shell({
    preview: 'Confirm your new email address for PeraKita.',
    heading: 'Confirm your new email',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: #64748B;">Please confirm <strong style="color:#0F172A;">{{ .NewEmail }}</strong> as the new email for your PeraKita account. If you did not request this change, ignore this message.</p>`,
    buttonLabel: 'Confirm new email',
    buttonHref: '{{ .ConfirmationURL }}',
  }),
  'reauthentication.html': shell({
    preview: 'Your PeraKita verification code.',
    heading: 'Verify it is you',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0 0 8px; font-size: 15px; line-height: 24px; color: #64748B;">Use this code to confirm a sensitive change on your PeraKita account. It expires shortly.</p>`,
    showCode: true,
  }),
  'password_changed.html': shell({
    preview: 'Your PeraKita password was changed.',
    heading: 'Your password was changed',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748B;">The password for <strong style="color:#0F172A;">{{ .Email }}</strong> was just changed. If this was not you, reset your password immediately and review your account.</p>`,
  }),
  'email_changed.html': shell({
    preview: 'Your PeraKita email address was changed.',
    heading: 'Your email was changed',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748B;">Your PeraKita email was changed from <strong style="color:#0F172A;">{{ .OldEmail }}</strong> to <strong style="color:#0F172A;">{{ .Email }}</strong>. If this was not you, contact support immediately.</p>`,
  }),
  'phone_changed.html': shell({
    preview: 'Your PeraKita phone number was changed.',
    heading: 'Your phone number was changed',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748B;">Your phone number was changed from <strong style="color:#0F172A;">{{ .OldPhone }}</strong> to <strong style="color:#0F172A;">{{ .Phone }}</strong>. If this was not you, review your account immediately.</p>`,
  }),
  'mfa_enrolled.html': shell({
    preview: 'A new verification method was added to PeraKita.',
    heading: 'Verification method added',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748B;">A new sign-in verification method (<strong style="color:#0F172A;">{{ .FactorType }}</strong>) was added to your PeraKita account. If this was not you, secure your account now.</p>`,
  }),
  'mfa_unenrolled.html': shell({
    preview: 'A verification method was removed from PeraKita.',
    heading: 'Verification method removed',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748B;">The sign-in verification method <strong style="color:#0F172A;">{{ .FactorType }}</strong> was removed from your PeraKita account. If this was not you, secure your account now.</p>`,
  }),
  'identity_linked.html': shell({
    preview: 'A sign-in method was linked to PeraKita.',
    heading: 'Sign-in method linked',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748B;">Your <strong style="color:#0F172A;">{{ .Provider }}</strong> account was linked as a sign-in method for <strong style="color:#0F172A;">{{ .Email }}</strong>. If this was not you, review your account immediately.</p>`,
  }),
  'identity_unlinked.html': shell({
    preview: 'A sign-in method was removed from PeraKita.',
    heading: 'Sign-in method removed',
    bodyHtml: `<p style="margin: 0 0 12px; font-size: 15px; line-height: 24px; color: #64748B;">${greeting}</p>
                <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748B;">Your <strong style="color:#0F172A;">{{ .Provider }}</strong> account was removed as a sign-in method for <strong style="color:#0F172A;">{{ .Email }}</strong>. If this was not you, review your account immediately.</p>`,
  }),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, html] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), html.trim() + '\n');
}

console.log(`Wrote ${Object.keys(files).length} email templates to supabase/templates`);
