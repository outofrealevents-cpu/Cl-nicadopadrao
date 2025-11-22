/**
 * CLOUD FUNCTION PARA NOTIFICAÇÃO DE EMAIL (V2 -- COM SECRETS)
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
// IMPORTANTE: Adicionamos 'defineSecret' aqui
const { defineString, defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

// -----------------------------------------------------------------------------
// 1. Definição das Variáveis
// -----------------------------------------------------------------------------
// O Email pode ser visível (defineString)
const senderEmailParam = defineString('GMAIL_EMAIL');

// A Password TEM de ser secreta (defineSecret)
const appPasswordSecret = defineSecret('GMAIL_PASSWORD');

const CLINIC_EMAIL = 'clinicadentariadopadrao@hotmail.com';

// -----------------------------------------------------------------------------
// 2. Configuração do Transporter
// -----------------------------------------------------------------------------
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: {
            user: senderEmailParam.value(), // Lê a string de configuração
            pass: appPasswordSecret.value(), // <--- Lê do cofre de segredos!
        },
        tls: {
            rejectUnauthorized: true
        },
        family: 4, // Força IPv4 (Anti-Timeout)
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
        logger: true,
        debug: true
    });
};

// =============================================================================
// FUNÇÃO PRINCIPAL
// =============================================================================
exports.sendAppointmentNotification = onDocumentCreated({
    document: 'agendamentos/{agendamentoId}',
    region: 'europe-west1',
    maxInstances: 5,
    memory: '256MiB',
    // AQUI ESTÁ O SEGREDOS: Dar permissão à função para ler a password
    secrets: [appPasswordSecret] 
}, async (event) => {
    
    const appointment = event.data?.data();
    if (!appointment) {
        console.log("No data found.");
        return null;
    }

    // Corpo do email
    const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #0b2540;">Novo Pedido de Marcação</h1>
            <p><strong>Paciente:</strong> ${appointment.nome}</p>
            <p><strong>Email:</strong> ${appointment.email}</p>
            <p><strong>Telefone:</strong> ${appointment.telefone}</p>
            <p><strong>Médico:</strong> ${appointment.medico}</p>
            <p><strong>Data:</strong> ${appointment.dataDesejada} - ${appointment.horaDesejada}</p>
        </div>
    `;

    const mailOptions = {
        to: CLINIC_EMAIL,
        from: senderEmailParam.value(),
        subject: `Novo Pedido: ${appointment.nome}`,
        html: emailBody,
    };

    try {
        const transporter = createTransporter();
        await transporter.sendMail(mailOptions);
        console.log('Email enviado com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar email:', error);
    }
    return null;
});
