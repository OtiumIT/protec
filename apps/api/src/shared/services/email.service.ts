import { Resend } from 'resend';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return null;
  return new Resend(key);
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'IATax <noreply@otiumit.com.br>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

export const emailService = {
  async sendPasswordReset(to: string, token: string): Promise<void> {
    const resend = getResend();
    if (!resend) {
      console.warn('[email] RESEND_API_KEY não configurada; e-mail de reset não enviado para', to);
      return;
    }
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Redefinição de senha — IATax',
      html: buildPasswordResetHtml(resetLink),
    });
  },

  async sendAccessWelcome(to: string, name: string, login: string, tempPassword: string): Promise<void> {
    const resend = getResend();
    if (!resend) {
      console.warn('[email] RESEND_API_KEY não configurada; e-mail de boas-vindas não enviado para', to);
      return;
    }
    const loginUrl = `${APP_URL.replace(/\/+$/, '')}/login`;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Seu acesso ao IATax foi liberado',
      html: buildAccessWelcomeHtml(name, login, tempPassword, loginUrl),
    });
  },

  async sendFeedbackReceivedNotification(params: {
    userName: string;
    userEmail: string;
    message: string;
    companyName?: string | null;
  }): Promise<void> {
    const resend = getResend();
    const adminEmails = (process.env.ADMIN_FEEDBACK_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    if (!resend || adminEmails.length === 0) {
      console.warn('[email] RESEND_API_KEY ou ADMIN_FEEDBACK_EMAILS não configurados; notificação de novo feedback ignorada');
      return;
    }

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmails,
      subject: `Novo feedback recebido — ${params.userName}`,
      html: buildFeedbackReceivedHtml(params),
    });
  },

  async sendFeedbackResponseNotification(params: {
    toEmail: string;
    userName: string;
    adminResponse: string;
  }): Promise<void> {
    const resend = getResend();
    if (!resend) {
      console.warn('[email] RESEND_API_KEY não configurada; notificação de resposta não enviada para', params.toEmail);
      return;
    }

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.toEmail,
      subject: 'Sua mensagem foi respondida — IATax',
      html: buildFeedbackResponseHtml(params),
    });
  },
};

function buildAccessWelcomeHtml(name: string, login: string, tempPassword: string, loginUrl: string): string {
  const firstName = name.split(' ')[0];
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acesso liberado</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; }
    .header p { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }
    .body { padding: 36px 40px; }
    .body p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .credentials { background: #f1f5f9; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
    .credentials table { width: 100%; border-collapse: collapse; }
    .credentials td { padding: 8px 0; color: #334155; font-size: 14px; vertical-align: top; }
    .credentials td:first-child { font-weight: 600; white-space: nowrap; padding-right: 16px; color: #64748b; }
    .credentials td:last-child { font-family: 'Courier New', monospace; word-break: break-all; }
    .btn { display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin: 8px 0 24px; }
    .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; font-size: 13px; color: #92400e; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>IATax Soluções Inteligentes</h1>
      <p>Cálculo Imobiliário</p>
    </div>
    <div class="body">
      <p>Olá <strong>${firstName}</strong>,</p>
      <p>Seu acesso ao sistema de Cálculo Imobiliário da IATax foi liberado. Abaixo estão suas credenciais de acesso:</p>

      <div class="credentials">
        <table>
          <tr><td>Login:</td><td>${login}</td></tr>
          <tr><td>Senha:</td><td>${tempPassword}</td></tr>
        </table>
      </div>

      <p style="text-align:center;">
        <a href="${loginUrl}" class="btn">Acessar o sistema</a>
      </p>

      <div class="note">
        <strong>Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso ao sistema.
      </div>

      <p style="margin-top:20px;font-size:13px;color:#94a3b8;">
        Link de acesso: <a href="${loginUrl}" style="color:#f59e0b;word-break:break-all;">${loginUrl}</a>
      </p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} IATax Soluções Inteligentes</div>
  </div>
</body>
</html>`;
}

function buildFeedbackReceivedHtml(params: {
  userName: string;
  userEmail: string;
  message: string;
  companyName?: string | null;
}): string {
  const companyLine = params.companyName
    ? `<tr><td>Empresa:</td><td>${params.companyName}</td></tr>`
    : '';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Novo feedback recebido</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; }
    .header p { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }
    .body { padding: 36px 40px; }
    .body p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .meta { background: #f1f5f9; border-radius: 12px; padding: 20px 24px; margin: 0 0 24px; }
    .meta table { width: 100%; border-collapse: collapse; }
    .meta td { padding: 6px 0; color: #334155; font-size: 14px; vertical-align: top; }
    .meta td:first-child { font-weight: 600; white-space: nowrap; padding-right: 16px; color: #64748b; width: 80px; }
    .message-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>IATax Soluções Inteligentes</h1>
      <p>Novo feedback recebido</p>
    </div>
    <div class="body">
      <p>Um usuário enviou um novo feedback pelo portal.</p>
      <div class="meta">
        <table>
          <tr><td>Nome:</td><td>${params.userName}</td></tr>
          <tr><td>E-mail:</td><td>${params.userEmail}</td></tr>
          ${companyLine}
        </table>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;font-weight:600;">Mensagem:</p>
      <div class="message-box">${params.message}</div>
    </div>
    <div class="footer">© ${new Date().getFullYear()} IATax Soluções Inteligentes</div>
  </div>
</body>
</html>`;
}

function buildFeedbackResponseHtml(params: {
  userName: string;
  adminResponse: string;
}): string {
  const firstName = params.userName.split(' ')[0];
  const portalUrl = APP_URL;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sua mensagem foi respondida</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; }
    .header p { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }
    .body { padding: 36px 40px; }
    .body p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .response-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; word-break: break-word; margin: 0 0 24px; }
    .btn { display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin: 8px 0 0; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>IATax Soluções Inteligentes</h1>
      <p>Sua mensagem foi respondida</p>
    </div>
    <div class="body">
      <p>Olá <strong>${firstName}</strong>,</p>
      <p>Nossa equipe respondeu à sua mensagem. Veja a resposta abaixo:</p>
      <div class="response-box">${params.adminResponse}</div>
      <p style="text-align:center;">
        <a href="${portalUrl}" class="btn">Acessar o portal</a>
      </p>
      <p style="margin-top:20px;font-size:13px;color:#94a3b8;">
        Você também pode acessar diretamente em: <a href="${portalUrl}" style="color:#f59e0b;word-break:break-all;">${portalUrl}</a>
      </p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} IATax Soluções Inteligentes</div>
  </div>
</body>
</html>`;
}

function buildPasswordResetHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de senha</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; }
    .header p { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }
    .body { padding: 36px 40px; }
    .body p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin: 8px 0 24px; }
    .note { background: #f1f5f9; border-radius: 8px; padding: 16px; font-size: 13px; color: #64748b; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>IATax Soluções Inteligentes</h1>
      <p>Sistema de Análise Fiscal e Tributária</p>
    </div>
    <div class="body">
      <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
      <p>Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
      <p style="text-align:center;">
        <a href="${resetLink}" class="btn">Redefinir minha senha</a>
      </p>
      <div class="note">
        Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha atual continuará a funcionar normalmente.
      </div>
      <p style="margin-top:20px;font-size:13px;color:#94a3b8;">
        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br />
        <a href="${resetLink}" style="color:#f59e0b;word-break:break-all;">${resetLink}</a>
      </p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} IATax Soluções Inteligentes</div>
  </div>
</body>
</html>`;
}
