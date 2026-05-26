import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { withAuth } from '../../../lib/authMiddleware';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function postHandler(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'raw',
      folder: 'modelos_sindicancia',
      public_id: `modelo_sindicancia_${Date.now()}`,
      use_filename: false,
    });

    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error('Erro upload raw:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
