/**
 * CLOUD FUNCTION - ENVIO VIA GMAIL (Recebe no Hotmail)
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineString, defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

// 1. VARIÁVEIS
const senderEmailParam = defineString('GMAIL_EMAIL');     // O teu Gmail (Carteiro)
const appPasswordSecret = defineSecret('GMAIL_PASSWORD'); // A Senha do Gmail
const CLINIC_EMAIL = 'clinicadentariadopadrao@hotmail.com'; // O teu Hotmail (Onde recebes)

// 2. CONFIGURAÇÃO (Carteiro GMAIL)
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail', // <--- MUDOU PARA GMAIL
        auth: {
            user: senderEmailParam.value(),
            pass: appPasswordSecret.value(),
        },
        family: 4,
    });
};

// 3. FUNÇÃO PRINCIPAL
exports.sendAppointmentNotification = onDocumentCreated({
    document: 'agendamentos/{agendamentoId}',
    region: 'europe-west1',
    maxInstances: 5,
    secrets: [appPasswordSecret]
}, async (event) => {
    
    const appointment = event.data?.data();
    if (!appointment) return null;

    // Corpo do email
    const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #0b2540;">Novo Pedido de Marcação</h2>
            <hr>
            <p><strong>Paciente:</strong> ${appointment.nome}</p>
            <p><strong>Email:</strong> ${appointment.email}</p>
            <p><strong>Telefone:</strong> ${appointment.telefone}</p>
            <p><strong>Médico:</strong> ${appointment.medico}</p>
            <p><strong>Data:</strong> ${appointment.dataDesejada} - ${appointment.horaDesejada}</p>
        </div>
    `;

    const mailOptions = {
        to: CLINIC_EMAIL, // <--- Vai para o teu Hotmail
        from: `Notificações Clínica <${senderEmailParam.value()}>`, // Vem do Gmail
        subject: `Nova Marcação: ${appointment.nome}`,
        html: emailBody,
    };

    try {
        const transporter = createTransporter();
        await transporter.sendMail(mailOptions);
        console.log('Email enviado com sucesso!');
    } catch (error) {
        console.error('ERRO:', error);
    }
    return null;
});