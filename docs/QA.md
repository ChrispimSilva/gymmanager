# 📋 Guia de QA & Manual de Testes — GymManager

Este documento contém o manual completo de **Garantia de Qualidade (QA)** do **GymManager**, incluindo instruções detalhadas para inicialização em ambiente local, matriz de contas de teste e cenários de testes funcionais, de regressão e de integração.

---

## 🚀 1. Inicialização Local da Aplicação

### 1.1. Pré-requisitos
* **Node.js**: Versão 18.0.0 ou superior (recomendado Node 20 LTS).
* **NPM**: Versão 9 ou superior.
* **Navegador Moderno**: Google Chrome, Mozilla Firefox, Microsoft Edge, Safari ou Brave.

### 1.2. Instalação e Execução

1. **Instalar as dependências do projeto:**
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   * A aplicação será disponibilizada em: `http://localhost:5173` (ou porta indicada no terminal).

3. **Executar a suíte de testes automatizados:**
   ```bash
   # Execução única de todos os testes
   npm test

   # Execução em modo observador (watch)
   npm run test:watch
   ```

4. **Verificar análise estática (Linter) e compilação TypeScript:**
   ```bash
   # Verificação do linter
   npm run lint

   # Verificação de tipagem e geração do bundle de produção PWA
   npm run build
   ```

---

## 🔑 2. Credenciais de Acesso para Testes

Ao abrir a aplicação pela primeira vez, o banco de dados local (`localStorage`) é populado automaticamente com os seguintes usuários de demonstração:

| Perfil | E-mail | Senha | Permissões / Acesso |
|---|---|---|---|
| **SuperAdmin** | `superadmin@gym.com` | `super123` | Dono da Plataforma SaaS (Gestão de Academias/Tenants, Contas Admin, Assentos e Backup Global) |
| **Admin (Academia)** | `admin@gym.com` | `admin123` | Dono do Tenant: Gestão de Equipe (Personais), Alunos, Treinos, Aparelhos e Configurações |
| **Personal** | `personal@gym.com` | `personal123` | Funcionário do Tenant: Gestão de Alunos, Treinos, Aparelhos, Exercícios Customizados e Evolução |
| **Aluno** | `aluno@gym.com` | `aluno123` | Cliente do Tenant: Visão personalizada (Meus Treinos, Executar Treino, Minha Evolução e Histórico) |

> 💡 **Dica de Teste:** Você também pode utilizar o botão **"Criar conta"** na tela de login para registrar novos usuários com qualquer perfil.

---

## 🧪 3. Matriz de Cenários de Teste (QA Test Cases)

---

### 🔹 CT-01: Autenticação, Perfis de Acesso & Auto-linking

* **Objetivo:** Validar login, controle de permissões por perfil e auto-criação de registro de aluno ao cadastrar usuário.
* **Passos:**
  1. Acessar `/login`.
  2. Informar e-mail `admin@gym.com` e senha `admin123` -> Clicar em **"Entrar"**.
     * **Resultado Esperado:** Toast de boas-vindas exibido e redirecionamento para o Dashboard administrativo.
  3. Clicar no avatar no canto superior direito e selecionar **"Sair da conta"**.
  4. Clicar na aba **"Criar conta"**, preencher:
     * Nome: `Lucas QA`
     * E-mail: `lucas.qa@teste.com`
     * Perfil: `Aluno`
     * Senha: `password123`
  5. Clicar em **"Criar Conta"**.
* **Resultado Esperado:** 
  * O usuário é cadastrado e autenticado com sucesso.
  * O sistema cria automaticamente a ficha correspondente do aluno no banco de dados.
  * O aluno visualiza o menu exclusivo (`Meus Treinos`, `Exercícios`, `Minha Evolução`).

---

### 🔹 CT-02: Gestão de Alunos & Cascade Delete

* **Objetivo:** Validar CRUD de alunos, alternância de status ativo/inativo e exclusão em cascata (cascade delete de treinos e históricos).
* **Passos:**
  1. Logar como Administrador (`admin@gym.com`).
  2. Navegar até a página **"Alunos"** (`/alunos`).
  3. Clicar em **"Novo Aluno"**, preencher os campos e salvar.
     * **Resultado Esperado:** Aluno adicionado à lista e toast de confirmação exibido.
  4. Clicar no badge **"Ativo"** para inativar o aluno.
     * **Resultado Esperado:** Status muda para "Inativo" e o contador no topo é atualizado em tempo real.
  5. Criar um treino para este aluno na página **"Treinos"**.
  6. Retornar para **"Alunos"** e clicar no botão de excluir (ícone de lixeira) do aluno criado.
  7. Confirmar a exclusão no modal `ConfirmDialog`.
* **Resultado Esperado:**
  * O aluno é excluído com sucesso.
  * **Validação em Cascata:** Ao abrir a tela de treinos e evolução, os registros vinculados àquele aluno foram removidos sem deixar dados órfãos.

---

### 🔹 CT-03: Criação e Edição de Treinos

* **Objetivo:** Validar montagem de treino com seleção de múltiplos exercícios e definição de séries, reps e cargas.
* **Passos:**
  1. Acessar a tela **"Treinos"** (`/treinos`) como Instrutor ou Admin.
  2. Clicar em **"Novo Treino"**.
  3. Preencher Nome (ex: `Treino Hipertrofia A`), selecionar Aluno e Grupo Muscular (`Peito`).
  4. Clicar em **"Adicionar Exercício"**, pesquisar por `Supino` e selecionar `Supino Reto com Barra`.
  5. Definir: Séries = `4`, Repetições = `10`, Carga = `60kg`, Observação = `Descanso de 60s`.
  6. Adicionar um segundo exercício (ex: `Crucifixo`) e clicar em **"Criar Treino"**.
* **Resultado Esperado:**
  * O treino é cadastrado com sucesso e listado no card do aluno correspondente.

---

### 🔹 CT-04: Modo "Treino em Execução" (Active Workout Tracker)

* **Objetivo:** Validar a experiência interativa de execução de treino em tempo real.
* **Passos:**
  1. Logar como Aluno (`aluno@gym.com`) ou clicar em **"Iniciar / Testar"** em qualquer treino.
  2. Acessar `/treino-ativo/:workoutId`.
  3. Observar o **Cronômetro ao Vivo** incrementando segundos.
  4. Clicar no botão de **Pausar** e depois **Continuar** o cronômetro.
  5. Marcar a **Série #1** do primeiro exercício como concluída.
     * **Resultado Esperado:** A linha fica verde destacada, a barra de progresso avança e o **Temporizador de Descanso** surge na tela.
  6. Alterar a carga de `60kg` para `65kg` na Série #2 e marcar como concluída.
  7. Concluir todas as séries e clicar em **"Finalizar Treino"**.
  8. No modal de resumo, preencher uma observação e clicar em **"Confirmar & Salvar"**.
* **Resultado Esperado:**
  * Toast de celebração exibido.
  * A sessão concluída é persistida no histórico com duração, volume (kg) e repetições calculadas.

---

### 🔹 CT-05: Temporizador de Descanso & Síntese Sonora

* **Objetivo:** Testar o overlay de descanso regressivo com alertas e controle de áudio.
* **Passos:**
  1. Durante a execução de um treino, marcar qualquer série como concluída.
  2. Observar o overlay flutuante no canto inferior direito com a contagem regressiva (ex: `01:00`).
  3. Clicar no botão **"+15s"** (aumenta o tempo) e **"-15s"** (reduz o tempo).
  4. Clicar no ícone de alto-falante para testar silenciar/ativar som.
  5. Deixar a contagem atingir os últimos 3 segundos (escutar os bips curtos e o acorde final de conclusão gerados via Web Audio API).
  6. Repetir e testar o botão **"Pular"**.
* **Resultado Esperado:** O timer fecha suavemente e a notificação sonora é executada conforme esperado.

---

### 🔹 CT-06: Catálogo de Exercícios & Exercício Customizado

* **Objetivo:** Validar busca, filtros por grupo muscular/equipamento e criação de exercícios personalizados.
* **Passos:**
  1. Acessar a página **"Exercícios"** (`/exercicios`).
  2. Digitar `Tríceps` na barra de pesquisa.
     * **Resultado Esperado:** Apenas exercícios que contenham o termo no nome ou músculo são exibidos.
  3. Abrir o painel **"Filtros"**, selecionar Grupo Muscular `Costas` e Equipamento `Halteres`.
  4. Clicar em **"Novo Exercício Personalizado"** (como Admin/Instrutor).
  5. Preencher:
     * Nome: `Elevação Lateral Especial Gym`
     * Grupo Muscular: `Ombros`
     * Equipamento: `Halteres`
     * Descrição: `Execução controlada com foco no deltóide lateral.`
  6. Clicar em **"Criar Exercício"**.
* **Resultado Esperado:**
  * O exercício é salvo e ganha o badge `✨ Custom`.
  * Fica disponível imediatamente para ser vinculado a novos treinos.

---

### 🔹 CT-07: Evolução Física & Cálculo Automático de IMC

* **Objetivo:** Validar o registro de avaliações físicas e geração de gráficos de tendência.
* **Passos:**
  1. Acessar a página **"Evolução"** (`/evolucao`).
  2. Selecionar um aluno (ex: `Ana Silva`).
  3. Clicar em **"Novo Registro"**, informar:
     * Peso: `72.5 kg`
     * % de Gordura: `18 %`
     * Massa Muscular: `35 kg`
  4. Salvar o registro.
* **Resultado Esperado:**
  * O IMC é calculado automaticamente com base na altura cadastrada do aluno ($IMC = \frac{peso}{altura^2}$).
  * O gráfico Chart.js é atualizado com o novo ponto na linha do tempo.

---

### 🔹 CT-08: Exportação e Impressão de Ficha de Treino (PDF)

* **Objetivo:** Validar a geração da ficha de treino pronta para impressão e exportação em PDF.
* **Passos:**
  1. Acessar a tela de **"Meus Treinos"** ou **"Treinos"**.
  2. Clicar em um treino para abrir a visualização detalhada.
  3. Clicar no botão **"Imprimir Ficha (PDF)"**.
* **Resultado Esperado:**
  * Uma janela de impressão nativa é aberta com formatação profissional (cabeçalho da academia, dados do aluno, tabela de exercícios com séries, reps, cargas e campos de visto).

---

### 🔹 CT-09: Sistema de Backup & Restauração JSON

* **Objetivo:** Validar a exportação de dados em JSON/AES-256 e restauração completa (operação global exclusiva do perfil `SuperAdmin`).
* **Passos:**
  1. Logar como `SuperAdmin` (`superadmin@gym.com`), clicar no menu do usuário (avatar) no Header e selecionar **"Backup & Gestão de Dados"**.
  2. Clicar em **"Baixar JSON"**.
     * **Resultado Esperado:** Download do arquivo `gymmanager-backup-AAAA-MM-DD.json` contendo todas as entidades.
  3. Clicar em **"Restaurar a partir de Backup"**, selecionar o arquivo baixado.
* **Resultado Esperado:**
  * Validação do formato JSON executada com sucesso.
  * Toast de sucesso exibido e dados recarregados na interface.

---

### 🔹 CT-10: PWA & Modo Offline

* **Objetivo:** Validar a capacidade de funcionamento offline sem perda de dados.
* **Passos:**
  1. Abrir a aplicação no navegador com a ferramenta de desenvolvimento (F12) -> aba **Network** (Rede).
  2. Selecionar a opção **"Offline"** no throttling de rede.
  3. Observar o topo da aplicação: o badge muda para **"Modo Offline (Salvo Localmente)"** em vermelho.
  4. Navegar entre as páginas (Dashboard, Alunos, Meus Treinos, Execução de Treino).
  5. Concluir um treino ou criar um aluno enquanto offline.
  6. Reativar a rede ("Online").
* **Resultado Esperado:**
  * A aplicação continua funcionando 100% sem falhas de carregamento.
  * O Service Worker provê os assets em cache.
  * Todos os dados criados offline permanecem intactos.

---

### 🔹 CT-11: Acessibilidade & Usabilidade

* **Objetivo:** Validar atalhos de teclado e comportamento de modais.
* **Passos:**
  1. Abrir qualquer modal da aplicação (ex: Formulário de Aluno, Visualização de Treino, Filtros ou Backup).
  2. Pressionar a tecla **`ESC`** no teclado.
     * **Resultado Esperado:** O modal é fechado imediatamente.
  3. Abrir o modal novamente e clicar fora da caixa (no backdrop escurecido).
     * **Resultado Esperado:** O modal fecha sem erros.
  4. Alternar entre modo claro e escuro no botão de tema (ícone de Sol / Lua).
     * **Resultado Esperado:** Cores e contrastes se adaptam perfeitamente sem quebras visuais.

---

### 🔹 CT-12: Gestão de Aparelhos / Equipamentos (Marca, Modelo, Localização Livre)

* **Objetivo:** Validar cadastro e organização de aparelhos da academia com marca, modelo e localização flexível.
* **Passos:**
  1. Logar como Administrador (`admin@gym.com`) ou Instrutor (`instrutor@gym.com`).
  2. Acessar a página **"Aparelhos"** (`/aparelhos`).
  3. Clicar em **"Novo Aparelho"**.
  4. Preencher:
     * Nome: `Leg Press 45° Articulado`
     * Marca: `Movement`
     * Modelo: `Linha Hi-Tech`
     * Localização na Academia: `Área Maromba - Piso 1`
     * Status: `Ativo`
     * Observações: `Capacidade até 450kg`
  5. Clicar em **"Cadastrar Aparelho"**.
* **Resultado Esperado:**
  * O aparelho é listado com badge de localização e status ativo.
  * O filtro por local e barra de pesquisa encontram o item instantaneamente.

---

### 🔹 CT-13: Personalização de Identidade Visual (Nome, Logo, Cores do Tema & PDF)

* **Objetivo:** Validar a customização do nome, logo e paletas de cores pelo Administrador e reflexo em tempo real no app e no PDF.
* **Passos:**
  1. Logar como Administrador (`admin@gym.com`).
  2. Acessar a aba **"Configurações"** (`/configuracoes`).
  3. Alterar o Nome da Academia para `Iron Force VIP`.
  4. Selecionar o tema de cor `Índigo Moderno` ou escolher uma cor no seletor livre.
  5. Clicar em **"Salvar Alterações"**.
  6. Visualizar a barra lateral, botões e badges: todos assumem a nova cor imediatamente.
  7. Acessar a tela de treinos e clicar em **"Imprimir Ficha (PDF)"**.
* **Resultado Esperado:**
  * O cabeçalho da ficha impressa e o título do documento trazem o novo nome da academia (`IRON FORCE VIP`) e a cor personalizada aplicada nas bordas e numeração.

---

### 🔹 CT-14: Acesso do Aluno ao Histórico de Treinos

* **Objetivo:** Validar que o perfil Aluno visualiza apenas seu próprio histórico de treinos e sessões executadas.
* **Passos:**
  1. Logar como Aluno (`aluno@gym.com`).
  2. Clicar no menu **"Histórico"** no menu lateral ou na barra inferior do celular.
  3. Visualizar as abas **"Treinos Realizados"** e **"Log de Atividades"**.
* **Resultado Esperado:**
  * O aluno tem acesso liberado à tela.
  * Apenas as sessões de treino realizadas por ele são exibidas (sem dados de outros alunos da academia).

---

### 🔹 CT-15: Validação do Relógio de Descanso em Smartphones (6 a 7 Polegadas)

* **Objetivo:** Validar a contagem fluida e precisa do temporizador de descanso sem travamento ao usar `-15s` até zerar.
* **Passos:**
  1. Logar como Aluno ou Instrutor e iniciar um treino ativo (`/treino-ativo/:id`).
  2. Concluir uma série para disparar o overlay de descanso.
  3. Clicar em **"-15s"** repetidamente até atingir 0 ou valores baixos.
  4. Observar que o relógio não congela, calcula o tempo real por timestamp e fecha suavemente com o alerta sonoro.
  5. Observar que o overlay fica posicionado no smartphone sem sobrepor a barra de navegação inferior nem botões do sistema.
* **Resultado Esperado:**
  * Cronômetro 100% fluido e preciso, sem atrasos em relação ao tempo real.

---

## 🛠️ 4. Solução de Problemas Comuns (Troubleshooting)

### Os dados de demonstração não aparecem ao abrir o app
* **Causa:** O localStorage pode estar bloqueado pelas configurações de privacidade do navegador.
* **Solução:** Logue como SuperAdmin, abra o menu do usuário -> **Backup & Gestão de Dados** -> **"Restaurar Dados Padrão (Demo)"** ou execute `localStorage.clear()` no console (F12) e recarregue a página.

### O áudio do temporizador de descanso não toca
* **Causa:** Políticas de autoplay dos navegadores exigem interação prévia do usuário na página antes de sintetizar áudio.
* **Solução:** Ao clicar e interagir com a aplicação durante o treino, o contexto de áudio é desbloqueado automaticamente.

### Erro de porta em uso ao rodar `npm run dev`
* **Solução:** O Vite automaticamente selecionará a próxima porta disponível (ex: `http://localhost:5174`). Se desejar forçar, execute `npx kill-port 5173`.

---

*Documento mantido pela equipe de QA e Engenharia do GymManager.*
