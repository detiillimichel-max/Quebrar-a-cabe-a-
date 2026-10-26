# 🧩 Quebra-Cabeça das Fases

Jogo de quebra-cabeça de imagens feito só com **HTML, CSS e JavaScript** (sem bibliotecas).

## Recursos
- 6 fases com imagens diferentes (a próxima fase é liberada ao completar a anterior)
- 3 níveis de dificuldade: Fácil (3×3), Médio (4×4) e Difícil (5×5)
- Cronômetro, contador de movimentos e peças corretas
- Botão de **Dica** (3 por partida) e botão **Ver imagem original**
- Arrastar e soltar ou tocar em duas peças para trocá-las (funciona no celular)
- Estrelas, recordes e progresso salvos no navegador
- Efeitos sonoros (podem ser desligados)

## Arquivos
```
index.html
style.css
script.js
imagens/fase1.jpg ... fase6.jpg
```

## Como publicar no GitHub Pages
1. Envie todos os arquivos (incluindo a pasta `imagens`) para a raiz do seu repositório.
2. No GitHub, abra **Settings → Pages**.
3. Em **Source**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/ (root)` e clique em **Save**.
4. Depois de 1 a 2 minutos o jogo estará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Como adicionar uma fase nova
Coloque uma imagem quadrada na pasta `imagens` e adicione uma linha na lista `FASES` no início do `script.js`:
```js
{ titulo: 'Minha Fase', imagem: 'imagens/minha-imagem.jpg' }
```
