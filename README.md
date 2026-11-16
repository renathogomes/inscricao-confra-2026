# Inscrição · Confraternização 2026 · IAP Poço

Página de inscrição para a confraternização da Igreja Adventista da Promessa – Poço
(11, 12 e 13 de dezembro de 2026).

- `site/`: a página publicada na Vercel. Valores, Pix, WhatsApp, alimentos e fotos ficam em `site/config.js`.
- `planilha/Codigo.gs`: código do Google Apps Script que grava as inscrições na planilha.
  As instruções para ativar estão no começo do arquivo.
- `divulgacao/`: banners para WhatsApp e Instagram (`banner-quadrado.png`, `banner-status.png`)
  e o modelo `banner.html` de onde eles saem. A prévia do link fica em `site/compartilhar.jpg`.

Toda alteração enviada para a branch `main` é publicada pela Vercel automaticamente.

Para ver no computador:

```
python3 -m http.server 8000 --directory site
```

e abra http://localhost:8000.
