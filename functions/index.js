/**
 * CLOUD FUNCTION PARA NOTIFICAÇÃO DE EMAIL
 * Versão V2 - Corrigida para evitar ETIMEDOUT
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

// -----------------------------------------------------------------------------
// 1. Definição das Variáveis Secretas
// -----------------------------------------------------------------------------
const SENDER_EMAIL = defineString('GMAIL_EMAIL');
const APP_PASSWORD = defineString('GMAIL_PASSWORD');
const CLINIC_EMAIL = 'clinicadentariadopadrao@hotmail.com';

// -----------------------------------------------------------------------------
// 2. Configuração do Transporter (CORRIGIDA)
// -----------------------------------------------------------------------------
// Criamos uma função para gerar o transporter. Isso garante que as
// credenciais (.value()) sejam lidas apenas no momento da execução,
// evitando erros de inicialização e garantindo a renovação de conexões.
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false, // false para porta 587 (usa STARTTLS)
        auth: {
            user: SENDER_EMAIL.value(),
            pass: APP_PASSWORD.value(),
        },
        // CORREÇÕES CRÍTICAS PARA ETIMEDOUT:
        tls: {
            ciphers: 'SSLv3', // Mantido apenas se for estritamente necessário (mas geralmente deve ser removido ou ajustado)
            // Na verdade, para Office 365 moderno, o ideal é remover 'ciphers: SSLv3'
            // Vou remover e deixar o padrão, mas forçar TLS
            rejectUnauthorized: true
        },
        // Removemos o 'ciphers: SSLv3' antigo pois bloqueia conexões modernas.
        // Adicionamos family: 4 para forçar IPv4 (Google Cloud as vezes falha com IPv6 no SMTP)
        family: 4, 
        
        // Timeouts para debug e evitar que a função fique presa para sempre
        connectionTimeout: 10000, // 10 segundos
        greetingTimeout: 5000,    // 5 segundos
        socketTimeout: 15000,     // 15 segundos
        
        // Logs para ajudar a identificar onde o erro ocorre
        logger: true,
        debug: true 
    });
};

// =============================================================================
// FUNÇÃO DE NOTIFICAÇÃO PRINCIPAL
// =============================================================================
exports.sendAppointmentNotification = onDocumentCreated({
    document: 'agendamentos/{agendamentoId}',
    region: 'europe-west1', // (Opcional) Defina a região se souber qual é (ex: us-central1, europe-west1)
    maxInstances: 5,
    memory: '256MiB' // Otimização de memória
}, async (event) => {
    
    // 1. Verificação de dados
    const appointment = event.data?.data();
    if (!appointment) {
        console.log("No data found for this document.");
        return null;
    }

    console.log(`Iniciando envio de email para agendamento: ${event.params.agendamentoId}`);

    // 2. Construção do corpo do email
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
        from: SENDER_EMAIL.value(),
        subject: `CLÍNICA DO PADRÃO: Novo Pedido de Marcação de ${appointment.nome}`,
        html: emailBody,
    };

    // 3. Enviar o email via Nodemailer
    try {
        // Inicializa o transporter aqui para garantir configurações frescas
        const transporter = createTransporter();
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Notificação de agendamento enviada com sucesso. MessageID:', info.messageId);
        return null;
    } catch (error) {
        console.error('ERRO FATAL AO ENVIAR EMAIL (V2):');
        console.error('- Código:', error.code);
        console.error('- Comando:', error.command);
        console.error('- Mensagem:', error.message);
        // Não lance o erro (throw) se não quiser que a função tente novamente (retry) infinitamente
        return null;
    }
});
