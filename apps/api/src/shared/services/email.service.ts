import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'IATax <noreply@iatax.com.br>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

export const emailService = {
  async sendPasswordReset(to: string, token: string): Promise<void> {
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Redefinição de senha — IATax',
      html: buildPasswordResetHtml(resetLink),
    });
  },
};

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
