# Spike: Integração e Compartilhamento Direto com Instagram Stories

> **Status:** Analisado / Em Roadmap (Fase de Produção / Mobile Bridge)  
> **Data:** Agosto / 2026  
> **Objetivo:** Mapear o comportamento do compartilhamento de treinos no Instagram (web, localhost, mobile PWA e app nativo) e definir os caminhos para integração zero-click.

---

## 1. Diagnóstico do Ambiente Web / Localhost

### 1.1 Limitações de Navegadores Desktop & Ambientes de Desenvolvimento
* **Protocolos Personalizados (`instagram://` / `instagram-stories://`)**:
  * Em navegadores desktop (Windows, macOS, Linux), o protocolo `instagram://` não é registrado nativamente pelo sistema operacional, a menos que o app desktop do Instagram esteja instalado e configurado como handler.
  * Tentar disparar `window.location.href = 'instagram://...'` em navegadores desktop resulta em erro silencioso, bloqueio de popup pelo navegador ou cancelamento de downloads pendentes.
* **Web Share API (`navigator.share`)**:
  * A `Web Share API` com suporte a arquivos (`navigator.canShare({ files: [...] })`) é suportada nativamente em smartphones (Google Chrome no Android e Safari no iOS).
  * Em desktops, o `navigator.share` geralmente só suporta links/texto ou não está disponível.

---

## 2. Solução Implementada no Web App / PWA (Atual)

Para garantir que o fluxo **nunca quebre** independente do dispositivo:

1. **Geração da Imagem em Alta Resolução (1080 × 1920)**:
   * Renderização client-side via HTML5 Canvas (Story 9:16).
2. **Download Automático / Salvar na Galeria**:
   * O arquivo PNG é salvo na galeria de imagens/downloads do dispositivo.
3. **Cópia da Legenda Customizada**:
   * A frase motivacional, dados e hashtags selecionadas são copiados para a área de transferência (`navigator.clipboard`).
4. **Tentativa de Compartilhamento Nativo com Fallback Seguro**:
   * Em dispositivos móveis com suporte a arquivos, invoca `navigator.share` (abrindo a bandeja nativa onde o usuário pode selecionar o Instagram).
   * Caso contrário, abre com segurança o Instagram (`https://www.instagram.com/`) em nova aba com feedback visual orientando a colar a legenda e selecionar a imagem da galeria.
5. **Auditoria Global (`workout_shared`)**:
   * Registra a atividade no histórico do sistema para acompanhamento do instrutor e administrador.

---

## 3. Caminhos para Integração Direta (Fases Futuras)

### Opção A: Meta Graph API (Instagram Content Publishing API)
* **Como funciona:**
  * Comunicação backend com a API oficial da Meta (`graph.facebook.com/v19.0/{ig-user-id}/media`).
* **Requisitos:**
  * App aprovado no [Meta for Developers](https://developers.facebook.com/).
  * Login com Facebook/Instagram (OAuth2) com permissões `instagram_content_publish`.
  * Conta do usuário deve ser Profissional/Criador de Conteúdo.
* **Prós & Contras:**
  * ✅ Publica diretamente no Feed/Reels via API.
  * ❌ Não permite postar direto em Stories efêmeros de contas pessoais comuns sem login Meta.

---

### Opção B: Deep Linking Nativo via Capacitor / React Native (Recomendado para App Mobile)
* **Como funciona:**
  * Ao empacotar o GymManager como aplicativo mobile (Android APK e iOS IPA):
  * **Android:** Dispara a Intent nativa `com.instagram.share.ADD_TO_STORY` com o arquivo de imagem via `FileProvider`:
    ```java
    Intent intent = new Intent("com.instagram.share.ADD_TO_STORY");
    intent.setType("image/png");
    intent.putExtra("interactive_asset_uri", stickerUri);
    intent.putExtra("top_background_color", "#064e3b");
    intent.putExtra("bottom_background_color", "#0f172a");
    activity.grantUriPermission("com.instagram.android", stickerUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
    activity.startActivity(intent);
    ```
  * **iOS:** Utiliza o UIPasteboard com o scheme `instagram-stories://share`:
    ```objc
    NSDictionary *items = @{@"com.instagram.sharedSticker.backgroundImage" : imageData};
    [UIPasteboard.generalPasteboard setItems:@[items] options:pasteboardOptions];
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:@"instagram-stories://share"]];
    ```
* **Prós & Contras:**
  * ✅ **Zero-click**: Abre a câmera de Stories do Instagram com o card do treino já posicionado e pronto para adicionar figurinhas/música.
  * ✅ Funciona para qualquer usuário (sem precisar de conta profissional ou API Meta).
  * ❌ Requer empacotamento nativo (Capacitor/Cordova).

---

## 4. Plano de Ação Recomendado

1. **Curto Prazo (PWA Atual)**:
   * Manter o fluxo híbrido: Salvar na galeria + Copiar legenda + Web Share / Redirecionamento seguro para o Instagram.
2. **Médio Prazo (Capacitor Bridge)**:
   * Adicionar o plugin `@capacitor/share` e intent direta para Instagram Stories no build Android/iOS da GymManager.
