const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputImage = path.join(__dirname, '../public/logo-bg.png');
const outputDir = path.join(__dirname, '../public/icons');

// Criar pasta se não existir
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Gerando ícones PWA...');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(inputImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 30, g: 58, b: 138, alpha: 1 } // #1e3a8a - azul escuro
      })
      .png()
      .toFile(outputPath);

    console.log(`✓ Criado: icon-${size}x${size}.png`);
  }

  console.log('\nTodos os ícones foram gerados com sucesso!');
}

generateIcons().catch(console.error);
