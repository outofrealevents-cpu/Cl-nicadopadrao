/**
 * CLOUD FUNCTION PARA NOTIFICAÇÃO DE EMAIL
 * Versão V2 - Usa o módulo 'params' para ler as variáveis secretas.
 * Esta função é acionada sempre que um novo agendamento é criado na coleção 'agendamentos'
 * no Cloud Firestore.
 */

// Importa as bibliotecas necessárias e o módulo 'params'
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

// -----------------------------------------------------------------------------
// 1. Definição das Variáveis Secretas (Parâmetros)
//    Estes nomes devem corresponder aos nomes que você usou no CLI (gmail.email e gmail.password)
// -----------------------------------------------------------------------------
const SENDER_EMAIL = defineString('GMAIL_EMAIL');
const APP_PASSWORD = defineString('GMAIL_PASSWORD');
const CLINIC_EMAIL = 'clinicadentariadopadrao@hotmail.com'; // O endereço de destino pode ser fixo aqui

// Configuração do transportador Nodemailer para o Outlook/Hotmail
// A configuração é carregada durante o runtime.
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 465,
    secure: true, 
    auth: {
        // Acessa os valores definidos nos parâmetros
        user: SENDER_EMAIL.value(), 
        pass: APP_PASSWORD.value(), 
    },
    tls: {
        ciphers:'SSLv3' 
    }
});

// =============================================================================
// FUNÇÃO DE NOTIFICAÇÃO PRINCIPAL: Acionada por nova criação no Firestore (V2)
// =============================================================================
exports.sendAppointmentNotification = onDocumentCreated({
    document: 'agendamentos/{agendamentoId}',
    maxInstances: 5 // Limite de instâncias para controlo de custos
}, async (event) => {
    
    // Verifica se os dados existem
    const appointment = event.data?.data();
    if (!appointment) {
        console.log("No data found for this document.");
        return null;
    }

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
        from: SENDER_EMAIL.value(), // O e-mail do Outlook/Hotmail que está a enviar
        subject: `CLÍNICA DO PADRÃO: Novo Pedido de Marcação de ${appointment.nome}`,
        html: emailBody,
    };

    // 3. Enviar o email via Nodemailer
    try {
        await transporter.sendMail(mailOptions);
        console.log('Notificação de agendamento enviada com sucesso (V2).');
        return null;
    } catch (error) {
        console.error('ERRO AO ENVIAR EMAIL VIA NODEMAILER (V2):', error);
        return null;
    }
});
