import { NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/authMiddleware';

async function postHandler(request) {
  try {
    const { senha } = await request.json();
    const senhaCorreta = process.env.CANDIDATOS_SENHA;

    if (!senhaCorreta) {
      return NextResponse.json({ success: false, error: 'Senha não configurada.' }, { status: 500 });
    }

    return NextResponse.json({ success: senha === senhaCorreta });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

export const POST = withAuth(postHandler);
