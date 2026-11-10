# 🧪 Diagnostix Exames

Aplicativo acadêmico de laboratório para demonstrar notificações locais usando React, Capacitor e Android.

## Aluno
- **Identificação:** Aluno 19
- **Projeto:** Diagnostix Exames

## Funcionalidades
- Verificação e solicitação da permissão de notificações.
- Envio de notificação imediata sobre o resultado do hemograma.
- Agendamento de alerta com quantidade de segundos configurável.
- Contador de notificações pendentes (`getPending`).
- Cancelamento de todas as notificações pendentes.
- Geração de PDF demonstrativo do laudo (desafio extra).

## Tecnologias
React, JavaScript, CSS, Vite, Capacitor, Local Notifications, jsPDF e Android Studio.

## Como abrir no VS Code

1. Extraia o ZIP.
2. Abra a pasta `diagnostix-exames-atualizado` no VS Code.
3. No terminal, execute:

```bash
npm install
npm run dev
```

O layout funciona no navegador. As notificações nativas precisam ser testadas no Android.

## Como preparar o Android

Se ainda não existe a pasta `android`:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Se a pasta `android` já existe, não execute `npx cap add android` novamente. Use:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

No Android Studio, conecte o celular, habilite a depuração USB e execute o aplicativo.

## Permissão Android 13+

O plugin solicita a permissão de notificações em tempo de execução. O projeto utiliza `checkPermissions()` e `requestPermissions()` para consultar e solicitar a autorização.

## Demonstração

Adicione capturas de tela na pasta `prints/` e inclua aqui os links do vídeo ou GIF gravado no celular.

## APK

O workflow do GitHub Actions em `.github/workflows/android.yml` pode gerar um APK de depuração. Após a execução, baixe o artefato `Diagnostix-Exames-APK` na aba Actions.

## Observação

O PDF gerado é fictício e serve somente para demonstrar o desafio extra. Não contém resultado médico real.
