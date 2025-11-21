/**
 * CLOUD FUNCTION PARA NOTIFICAÇÃO DE EMAIL
 * Usa Nodemailer para enviar o email através do SMTP do Outlook/Hotmail.
 */

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// --- Configuração das Variáveis Secretas ---
const SENDER_EMAIL = functions.config().gmail.email;     // Usamos o mesmo nome da variável secreta, mas agora armazena o email do Outlook/Hotmail
const APP_PASSWORD = functions.config().gmail.password;   // Armazena a Palavra-Passe de Aplicação do Outlook/Hotmail
const CLINIC_EMAIL = 'clinicadentariadopadrao@hotmail.com'; // O endereço final que recebe a notificação (que é o mesmo que SENDER_EMAIL neste caso)

// Configuração do transportador Nodemailer para o Outlook/Hotmail
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com', // Servidor SMTP da Microsoft (Outlook/Hotmail)
    port: 587,
    secure: false, // Usar TLS em vez de SSL (porta 587)
    auth: {
        user: SENDER_EMAIL,
        pass: APP_PASSWORD, // Palavra-Passe de Aplicação do Outlook/Hotmail
    },
    tls: {
        ciphers:'SSLv3' // Correção de segurança para alguns servidores SMTP
    }
});

// 1. A função é acionada na criação de um documento na coleção 'agendamentos'
exports.sendAppointmentNotification = functions.firestore
    .document('agendamentos/{agendamentoId}')
    .onCreate((snap, context) => {
        
        const appointment = snap.data();

        // 2. Construção do corpo do email (HTML formatado)
        const emailBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7; color: #333;">
                <h1 style="color: #0b2540; border-bottom: 2px solid #bba458; padding-bottom: 10px;">
                    🚨 NOVO PEDIDO DE MARCAÇÃO RECEBIDO
                </h1>
                <p style="font-size: 16px;">Um novo pedido de marcação foi enviado através do site e guardado no Firestore.</p>
                <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 15px; margin-top: 20px; border-radius: 8px;">
                    <p><strong>Nome do Paciente:</strong> ${appointment.nome}</p>
                    <p><strong>E-mail:</strong> ${appointment.email}</p>
                    <p><strong>Telefone:</strong> ${appointment.telefone}</p>
                    <p><strong>Médico Desejado:</strong> ${appointment.medico}</p>
                    <p><strong>Data Desejada:</strong> ${appointment.dataDesejada}</p>
                    <p><strong>Hora Desejada:</strong> ${appointment.horaDesejada}</p>
                    <p><strong>Status:</strong> ${appointment.status}</p>
                </div>
                <h3 style="color: #0b2540; margin-top: 20px;">Ação Necessária:</h3>
                <p style="font-size: 16px; font-weight: bold; color: #bba458;">Por favor, contacte o paciente (por telefone ou email) para confirmar a disponibilidade na agenda real da clínica.</p>
            </div>
        `;

        const mailOptions = {
            to: CLINIC_EMAIL,
            from: SENDER_EMAIL, // O e-mail do Outlook/Hotmail que está a enviar
            subject: `CLÍNICA DO PADRÃO: Novo Pedido de Marcação de ${appointment.nome}`,
            html: emailBody,
        };

        // 3. Enviar o email via Nodemailer
        return transporter.sendMail(mailOptions)
            .then(() => {
                console.log('Notificação de agendamento enviada com sucesso para a clínica via Nodemailer (Outlook).');
                return null;
            })
            .catch((error) => {
                console.error('ERRO AO ENVIAR EMAIL VIA NODEMAILER (Outlook):', error);
                return null; 
            });
    });