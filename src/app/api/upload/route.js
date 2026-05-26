// app/api/upload/route.js
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { withAuth } from '../../../lib/authMiddleware';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function postHandler(request, { user }) {
  try {
    // DEBUG: Log das variáveis de ambiente
    console.log('=== DEBUG UPLOAD ===');
    console.log('CLOUD_NAME:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING');
    console.log('API_KEY:', process.env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING');
    console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING');
    console.log('====================');

    // Verificar se as credenciais do Cloudinary estão configuradas
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary credentials missing:', {
        cloud_name: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: !!process.env.CLOUDINARY_API_KEY,
        api_secret: !!process.env.CLOUDINARY_API_SECRET
      });
      return NextResponse.json({
        success: false,
        error: 'Configuração do servidor incompleta. Contate o administrador.'
      }, { status: 500 });
    }

    const body = await request.json();
    const { file } = body;

    // Validar formato do arquivo (data URI)
    if (!file || !file.startsWith('data:image/')) {
      return NextResponse.json({
        success: false,
        error: 'Arquivo inválido. Apenas imagens são permitidas.'
      }, { status: 400 });
    }

    // Validar tamanho (base64 string ~= tamanho real * 1.37)
    // Limite: 5MB de imagem = ~6.85MB em base64
    const maxSize = 6.85 * 1024 * 1024; // bytes
    if (file.length > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'Arquivo muito grande. Tamanho máximo: 5MB.'
      }, { status: 400 });
    }

    console.log('Iniciando upload para Cloudinary...');

    // Upload para Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(file, {
      folder: 'assinaturas', // Pasta no Cloudinary
      transformation: [
        { width: 400, height: 150, crop: 'limit' }, // Redimensiona
        { quality: 'auto:eco' }, // Comprime automaticamente
        { format: 'webp' } // Converte para WebP (menor tamanho)
      ]
    });

    console.log('Upload concluído:', uploadResponse.secure_url);

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url
    });

  } catch (error) {
    console.error('Erro no upload:', error.message);
    console.error('Stack:', error.stack);

    // Retornar mensagem de erro mais específica
    let errorMessage = 'Erro ao fazer upload';
    if (error.message?.includes('Invalid')) {
      errorMessage = 'Credenciais do Cloudinary inválidas';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Timeout no upload. Tente novamente.';
    } else if (error.http_code) {
      errorMessage = `Erro do Cloudinary: ${error.message}`;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
