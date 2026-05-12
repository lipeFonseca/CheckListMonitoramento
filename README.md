# Checklist de Câmeras - Monitoramento

Uma aplicação web moderna para gerenciar checklists diários de câmeras de monitoramento, com suporte a anexação de imagens e geração de relatórios em PDF.

## Recursos

- ✅ **Checklist por câmera** - Avalie ângulo, percentual de imagem e funcionamento
- 📸 **Anexação de imagens** - Adicione fotos para documentação
- 📊 **Relatórios** - Gere PDF com resumo e detalhes
- 💾 **Armazenamento local** - Salve modelos de câmeras no navegador
- 📥 **Exportação** - Exporte dados em CSV
- 🎨 **Interface responsiva** - Funciona em desktop e mobile

## Como usar

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### Build para produção

```bash
npm run build
```

Os arquivos compilados estarão em `dist/`.

### Deploy no GitHub Pages

1. Configure `homepage` no `package.json` com sua URL
2. Faça o build: `npm run build`
3. Commit e push dos arquivos `dist/` para o repositório

## Funcionalidades

### Preenchimento do Checklist
1. Preencha data, local e responsável
2. Para cada câmera, avalie:
   - Ângulo correto
   - Percentual de imagem adequado
   - Câmera funcionando
   - Percentual de parede/obstrução
3. Adicione observações se necessário
4. Anexe imagens para documentação

### Exportação de Relatórios
- **PDF**: Gera relatório com tabela resumida e detalhamento com imagens (use a função de impressão do navegador)
- **CSV**: Exporta dados para abrir em Excel/Sheets

### Modelos de Câmeras
- **Salvar modelo**: Guarda a configuração de câmeras no localStorage do navegador
- **Carregar modelo**: Carrega a última configuração salva para novo checklist

## Tecnologias

- **React 18** - Framework frontend
- **Vite** - Build tool rápido
- **Tailwind CSS** - Estilos utilitários
- **Framer Motion** - Animações
- **Lucide React** - Ícones
- **jsPDF** - Geração de PDF

## Estrutura do Projeto

```
src/
├── App.jsx              # Componente principal
├── main.jsx             # Entry point
├── index.css            # Estilos globais
└── components/
    ├── Button.jsx       # Componente Button
    ├── Card.jsx         # Componentes Card e CardContent
    └── index.js         # Exportações
```

## Armazenamento de Dados

Os dados são armazenados no **localStorage do navegador** durante a sessão. Ao final, você pode:
- Exportar como CSV
- Gerar PDF e baixar
- Salvar o modelo de câmeras para reutilizar

## Notas Importantes

- Os dados não são persistidos em servidor - use o navegador do mesmo dispositivo
- Limpar dados do navegador apagará histórico do localStorage
- PDF é gerado usando a função de impressão nativa do navegador
- CSV usa encoding UTF-8 com BOM para compatibilidade com Excel

## Contribuições

Sinta-se livre para abrir issues e enviar pull requests!

## Licença

MIT
