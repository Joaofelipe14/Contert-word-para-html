const express = require('express');
const multer = require('multer');
const path = require('path');
const mammoth = require('mammoth');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Verifique e crie a pasta "uploads" se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + fileExtension);
  }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
  }

  const docxFilePath = path.join('uploads', req.file.filename);
  const htmlFilePath = path.join('uploads', req.file.filename.replace('.docx', '.html'));

  // Realize a conversão do .docx para HTML usando mammoth.js
  mammoth.convertToHtml({ path: docxFilePath })
    .then(result => {
      const html = processHTMLWithImageMarkers(result.value);// filtro de imagems 
      const htmlnovo = substituirH1ComEspacoEmBranco(html)
      const novonov =   manterListasHTML(htmlnovo)
      const htmlnew = processHTMLWithVideoMarkers(novonov)


      // Use uma expressão regular para adicionar um indicador de nova página
      const htmlWithPageIndicator = htmlnew.replace(/<h1/g, '<!-- Nova Página --><h1');

      // Salve o conteúdo em um arquivo HTML
      fs.writeFileSync(htmlFilePath, htmlWithPageIndicator);

      // res.status(200).json({ message: 'Conteúdo convertido para HTML com indicadores de nova página.' });
      res.status(200).json(html);

    })
    .catch(error => {
      console.error('Erro ao converter o arquivo Word:', error);
      res.status(500).json({ error: 'Ocorreu um erro ao converter o arquivo Word.' });
    });
});

app.listen(port, () => {
  console.log(`Servidor em execução na porta ${port}`);
});


// Como usar @@tamanho:pequenavertical@@https://api.recarrega.app.br/uploads/images/SNpeK09x3bf8BPGb8Yra5sdrtkzGFYO5jl39N901.png@@
function processHTMLWithImageMarkers(html) {
  // Use uma expressão regular para encontrar os marcadores @@tamanho:...@@ e @@link@@
  const regex = /@@tamanho:(\w+)@@([^@]+)@@/g;

  // Execute a substituição de forma iterativa
  let modifiedHTML = html;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const [fullMatch, tamanho, link] = match;

    let tamanhoCSS = '';

    // Defina o tamanho com base no valor do tamanho
    if (tamanho === 'pequena') {
      tamanhoCSS = 'width: 100%; height: 250px; object-fit: fill;     border-radius: 15px;';
    } else if (tamanho === 'media') {
      tamanhoCSS = 'width: 100%; height: 40vh; object-fit: fill;     border-radius: 15px;';
    } else if (tamanho === 'grande') {
      tamanhoCSS = 'width: 100%; height: 80vh; object-fit: fill;     border-radius: 15px;';
    } else if (tamanho === 'pequenavertical') {
      tamanhoCSS = 'width: 90%;  height: 40vh; object-fit: scale-down;   border-radius: 15px;';
    }

    // Crie o elemento <img> com os estilos apropriados e a classe de tamanho
    const imgElement = `<img src="${link}" style="${tamanhoCSS}"  classe="${tamanho}" alt="Imagem ${tamanho}">`;

    // Substitua o marcador no HTML
    modifiedHTML = modifiedHTML.replace(fullMatch, imgElement);
  }

  return modifiedHTML;
}



// Colocar o delimitador de pagina e adicionar espaçoes em branco " " quebra a pagina sem elemento

function substituirH1ComEspacoEmBranco(html) {
  // Substitua a string [quebra de página] pela tag <h1>
  return html.replace(/\[quebra de página\]/gi, '<h1 class="texto-invisivel">Este texto está invisível Este texto está invisível.</h1>');
}



  // Função para processar o marcador @@video@@
function processHTMLWithVideoMarkers(html) {
  // Use uma expressão regular para encontrar a marcação @@video@@
  const regex = /@@video@@([^@]+)@@/g;

  // Execute a substituição de forma iterativa
  let modifiedHTML = html;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const [fullMatch, videoLink] = match;

    console.log(videoLink)
    // Crie o elemento <iframe> com o link do vídeo
    const iframeElement = `<iframe class="borda-iframe" src="${videoLink}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;

    // Substitua a marcação @@video@@ no HTML
    modifiedHTML = modifiedHTML.replace(fullMatch, iframeElement);
  }

  return modifiedHTML;
}


//Agora, se você adicionar @@open@@ ou @@closed@@ ao início de um item de lista no Word, a função adicionará as classes correspondentes aos elementos <li> no HTML gerado.
  // Verificar se textoOriginal é uma string
  function manterListasHTML(html) {
    // Adicionar classes aos itens de lista <li>
    html = html.replace(/<li>(.*?)<\/li>/g, (match, conteudo) => {
      if (conteudo && conteudo.trim().startsWith('@@open@@')) {
        console.log(conteudo)
        return `<li class="open">${conteudo.replace('@@open@@', '').trim()}</li>`;
      } else if (conteudo && conteudo.trim().startsWith('@@closed@@')) {
        console.log(conteudo)
        return `<li class="closed">${conteudo.replace('@@closed@@', '').trim()}</li>`;
      } else {

        return match; // Não modifica se não houver marcador específico
      }
    });
  
    return html;
  }
  
  