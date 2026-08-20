const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATES = path.join(ROOT, 'supabase/templates');
const PROJECT_REF = fs
  .readFileSync(path.join(ROOT, 'supabase/.temp/project-ref'), 'utf8')
  .trim();

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES, name), 'utf8');
}

function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const file = path.join(os.homedir(), '.supabase', 'access-token');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  throw new Error(
    'Missing Supabase access token. Run `npx supabase login` or set SUPABASE_ACCESS_TOKEN.'
  );
}

const payload = {
  mailer_subjects_confirmation: 'Confirm your PeraKita account',
  mailer_templates_confirmation_content: readTemplate('confirmation.html'),
  mailer_subjects_recovery: 'Reset your PeraKita password',
  mailer_templates_recovery_content: readTemplate('recovery.html'),
  mailer_subjects_magic_link: 'Your PeraKita sign-in link',
  mailer_templates_magic_link_content: readTemplate('magic_link.html'),
  mailer_subjects_invite: "You're invited to PeraKita",
  mailer_templates_invite_content: readTemplate('invite.html'),
  mailer_subjects_email_change: 'Confirm your new PeraKita email',
  mailer_templates_email_change_content: readTemplate('email_change.html'),
  mailer_subjects_reauthentication: '{{ .Token }} is your PeraKita verification code',
  mailer_templates_reauthentication_content: readTemplate('reauthentication.html'),
  mailer_notifications_password_changed_enabled: true,
  mailer_subjects_password_changed_notification: 'Your PeraKita password was changed',
  mailer_templates_password_changed_notification_content: readTemplate('password_changed.html'),
  mailer_notifications_email_changed_enabled: true,
  mailer_subjects_email_changed_notification: 'Your PeraKita email was changed',
  mailer_templates_email_changed_notification_content: readTemplate('email_changed.html'),
  mailer_notifications_phone_changed_enabled: true,
  mailer_subjects_phone_changed_notification: 'Your PeraKita phone number was changed',
  mailer_templates_phone_changed_notification_content: readTemplate('phone_changed.html'),
  mailer_notifications_mfa_factor_enrolled_enabled: true,
  mailer_subjects_mfa_factor_enrolled_notification: 'A verification method was added to PeraKita',
  mailer_templates_mfa_factor_enrolled_notification_content: readTemplate('mfa_enrolled.html'),
  mailer_notifications_mfa_factor_unenrolled_enabled: true,
  mailer_subjects_mfa_factor_unenrolled_notification:
    'A verification method was removed from PeraKita',
  mailer_templates_mfa_factor_unenrolled_notification_content: readTemplate('mfa_unenrolled.html'),
  mailer_notifications_identity_linked_enabled: true,
  mailer_subjects_identity_linked_notification: 'A sign-in method was linked to PeraKita',
  mailer_templates_identity_linked_notification_content: readTemplate('identity_linked.html'),
  mailer_notifications_identity_unlinked_enabled: true,
  mailer_subjects_identity_unlinked_notification: 'A sign-in method was removed from PeraKita',
  mailer_templates_identity_unlinked_notification_content: readTemplate('identity_unlinked.html'),
};

async function main() {
  const token = accessToken();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to update email templates (${res.status}): ${text}`);
  }
  console.log(`Updated hosted email templates for project ${PROJECT_REF}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
