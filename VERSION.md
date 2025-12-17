# Versão do Jogo

## Como atualizar a versão

A versão do jogo está definida em `script.js` na constante `GAME_VERSION`.

### Para sincronizar com GitHub Tags:

1. **Criar uma tag no Git:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Atualizar a constante no código:**
   - Edite `script.js`
   - Localize `const GAME_VERSION = '1.0.0';`
   - Atualize para a nova versão

3. **Ou usar um script de build** (opcional):
   - Criar um script que lê a tag do git e atualiza automaticamente

### Versão Atual
v1.0.0
