import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_855wgm5';
const TEMPLATE_ID = 'template_qfq8qfa';
const PUBLIC_KEY = 'B-kWSiPrJCYfHX9FU';

export const enviarCredenciales = async ({ nombre, email, passwordTemporal }) => {
  const templateParams = {
    nombre,
    email,
    password_temporal: passwordTemporal,
    link_login: window.location.origin + '/',
  };

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    console.log('Correo enviado correctamente');
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw error;
  }
};