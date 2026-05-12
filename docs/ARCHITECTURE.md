# 🏗️ Arquitetura do GymManager

Este documento descreve a arquitetura técnica do GymManager, incluindo o fluxo de autenticação, persistência de dados e orientações para migração para um banco de dados relacional.

---

## Visão Geral

O GymManager é uma **SPA (Single Page Application)** construída inteiramente no frontend. Não existe backend nem banco de dados — todos os dados são persistidos no **`localStorage`** do navegador.

```
┌──────────────────────────────────────────────────┐
│                    BROWSER                       │
│                                                  │
│  ┌────────────┐   ┌────────────┐   ┌──────────┐ │
│  │   Pages    │──▶│  Services  │──▶│ localStorage│
│  │  (React)   │   │  (CRUD)    │   │  (JSON)    │ │
│  └─────┬──────┘   └────────────┘   └──────────┘ │
│        │                                         │
│  ┌─────▼──────┐                                  │
│  │  Contexts  │  AuthContext, ThemeContext        │
│  └────────────┘                                  │
└──────────────────────────────────────────────────┘
```

### Camadas da Aplicação

| Camada | Diretório | Responsabilidade |
|---|---|---|
| **Pages** | `src/pages/` | Telas da aplicação (Login, Dashboard, Alunos, etc.) |
| **Components** | `src/components/` | Componentes reutilizáveis de layout |
| **Contexts** | `src/contexts/` | Estado global (autenticação, tema) |
| **Services** | `src/services/` | CRUD de dados via localStorage |
| **Hooks** | `src/hooks/` | Lógica reutilizável (ex: catálogo de exercícios) |
| **Types** | `src/types/` | Definições de tipos TypeScript |
| **Utils** | `src/utils/` | Dados iniciais (seed) |
| **Data** | `src/data/` | Catálogo estático de exercícios (JSON) |

---

## 🔐 Autenticação

### Fluxo de Login

```
Usuário digita email + senha
        │
        ▼
  LoginPage.tsx
        │ login(email, password)
        ▼
  AuthContext.tsx
        │ userService.authenticate(email, password)
        ▼
  userService.ts
        │ Lê "gymmanager-users" do localStorage
        │ Busca usuário por email
        │ Compara senha em texto plano
        ▼
  ┌─── Encontrou? ───┐
  │ SIM               │ NÃO
  ▼                   ▼
Salva sessão em     Retorna erro
"gymmanager-auth"   "Email ou senha incorretos"
  │
  ▼
Redireciona para
/dashboard
```

### Detalhes da Implementação

- **`userService.ts`** → O método `authenticate(email, password)` faz uma busca simples no array de usuários e compara a senha **em texto plano** (sem hash).
- **`AuthContext.tsx`** → Ao logar com sucesso, salva o objeto `User` completo no state do React e no `localStorage` (chave `gymmanager-auth`).
- **`App.tsx`** → O componente `ProtectedRoute` verifica `isAuthenticated` para proteger rotas. O `RoleGuard` restringe acesso por perfil (`admin`, `instrutor`, `aluno`).

### Controle de Acesso por Perfil

| Rota | Admin | Instrutor | Aluno |
|---|:---:|:---:|:---:|
| `/dashboard` | ✅ | ✅ | ✅ |
| `/alunos` | ✅ | ✅ | ✅ (somente seu perfil) |
| `/treinos` | ✅ | ✅ | ❌ |
| `/meus-treinos` | ✅ | ✅ | ✅ |
| `/exercicios` | ✅ | ✅ | ✅ |
| `/evolucao` | ✅ | ✅ | ✅ |
| `/historico` | ✅ | ✅ | ❌ |

### ⚠️ Limitações de Segurança

> **Este projeto é educacional.** A autenticação atual **não é segura para produção** porque:
> - Senhas são armazenadas em **texto plano** (sem bcrypt/hash)
> - Não há tokens JWT nem cookies HttpOnly
> - Qualquer pessoa pode inspecionar os dados pelo DevTools do navegador
> - Não existe validação server-side

---

## 💾 Persistência de Dados

### Onde ficam os dados

Todos os dados são armazenados no **`localStorage`** do navegador como strings JSON.

| Chave no localStorage | Service | Conteúdo |
|---|---|---|
| `gymmanager-users` | `userService.ts` | Usuários do sistema (admin, instrutor, aluno) |
| `gymmanager-students` | `studentService.ts` | Cadastro de alunos (nome, email, medidas) |
| `gymmanager-workouts` | `workoutService.ts` | Fichas de treino com exercícios |
| `gymmanager-progress` | `progressService.ts` | Registros de evolução física (peso, IMC, etc.) |
| `gymmanager-activities` | `activityService.ts` | Log de atividades realizadas |
| `gymmanager-auth` | `AuthContext.tsx` | Sessão do usuário logado |
| `gymmanager-theme` | `ThemeContext.tsx` | Preferência de tema (dark/light) |
| `gymmanager-seeded` | `seedData.ts` | Flag indicando se dados iniciais foram carregados |

### Padrão dos Services

Todos os services seguem o mesmo padrão CRUD:

```typescript
const STORAGE_KEY = 'gymmanager-xxx';

// Leitura
function getAll(): Entity[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Escrita
function save(entities: Entity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
}

// Create
function create(data: Partial<Entity>): Entity {
  const all = getAll();
  const newEntity = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
  all.push(newEntity);
  save(all);
  return newEntity;
}

// Update
function update(id: string, data: Partial<Entity>): void {
  const all = getAll();
  const index = all.findIndex(e => e.id === id);
  if (index >= 0) {
    all[index] = { ...all[index], ...data };
    save(all);
  }
}

// Delete
function remove(id: string): void {
  save(getAll().filter(e => e.id !== id));
}
```

### Dados Iniciais (Seed)

No primeiro acesso, o arquivo `src/utils/seedData.ts` é executado e popula o localStorage com:
- 3 usuários padrão (admin, instrutor, aluno)
- 3 alunos de exemplo
- 3 treinos com exercícios
- Registros de evolução física
- Log de atividades

A flag `gymmanager-seeded` impede que o seed seja executado novamente.

### ⚠️ Limitações do localStorage

- Limite de **~5-10 MB** por domínio (varia por navegador)
- Dados perdidos ao **limpar cache** do navegador
- Sem sincronização entre dispositivos/navegadores
- Sem controle de concorrência (múltiplas abas podem causar conflito)
- Dados visíveis/editáveis pelo DevTools

---

## 🚀 Guia de Migração para Banco de Dados Real

### Pré-requisitos

Para migrar do localStorage para um banco relacional (MySQL ou PostgreSQL), será necessário criar uma **camada de backend**.

### Estrutura Proposta

```
gymmanager/
├── frontend/              ← React (o que já existe)
│   └── src/
│       └── services/      ← Trocar localStorage por fetch()
│
└── backend/               ← NOVO
    ├── src/
    │   ├── routes/        ← Endpoints REST (ou GraphQL)
    │   ├── controllers/   ← Lógica de negócio
    │   ├── models/        ← Definição das tabelas (ORM)
    │   ├── middleware/     ← Autenticação JWT + autorização
    │   └── config/        ← Conexão com banco de dados
    ├── package.json
    └── tsconfig.json
```

### Passo 1 — Modelar as tabelas

Os tipos TypeScript em `src/types/index.ts` já mapeiam diretamente para tabelas. Exemplo usando **Prisma ORM**:

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"  // ou "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String   // Hash bcrypt
  role      String   // 'admin' | 'instrutor' | 'aluno'
  avatar    String?
  createdAt DateTime @default(now())

  workouts   Workout[]    @relation("instructor")
  activities ActivityLog[]
}

model Student {
  id        String    @id @default(uuid())
  userId    String?   @unique
  name      String
  email     String
  phone     String?
  birthDate DateTime?
  weight    Float
  height    Float
  goal      String
  active    Boolean   @default(true)
  photo     String?
  createdAt DateTime  @default(now())

  workouts  Workout[]
  progress  PhysicalProgress[]
}

model Workout {
  id           String   @id @default(uuid())
  studentId    String
  instructorId String
  name         String
  description  String?
  muscleGroup  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  student    Student           @relation(fields: [studentId], references: [id])
  instructor User              @relation("instructor", fields: [instructorId], references: [id])
  exercises  WorkoutExercise[]
}

model WorkoutExercise {
  id          String @id @default(uuid())
  workoutId   String
  exerciseId  Int
  sets        Int
  repetitions Int
  weight      Float
  notes       String?
  order       Int

  workout Workout @relation(fields: [workoutId], references: [id], onDelete: Cascade)
}

model PhysicalProgress {
  id         String   @id @default(uuid())
  studentId  String
  weight     Float
  bodyFat    Float?
  muscleMass Float?
  bmi        Float
  recordedAt DateTime @default(now())

  student Student @relation(fields: [studentId], references: [id])
}

model ActivityLog {
  id          String   @id @default(uuid())
  userId      String
  type        String
  description String
  relatedId   String?
  timestamp   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

### Passo 2 — Criar os endpoints REST

Exemplo de API para alunos:

```
GET    /api/students         → Lista todos os alunos
POST   /api/students         → Cadastra novo aluno
GET    /api/students/:id     → Detalhe de um aluno
PUT    /api/students/:id     → Atualiza aluno
DELETE /api/students/:id     → Remove aluno

POST   /api/auth/login       → Autenticação (retorna JWT)
POST   /api/auth/register    → Cadastro de usuário

GET    /api/workouts         → Lista treinos
POST   /api/workouts         → Cria treino
...
```

### Passo 3 — Adaptar os services do frontend

Cada service que hoje usa `localStorage` passaria a fazer chamadas HTTP:

```typescript
// ANTES — studentService.ts (localStorage)
function getAll(): Student[] {
  const data = localStorage.getItem('gymmanager-students');
  return data ? JSON.parse(data) : [];
}

function create(data: Partial<Student>): Student {
  const all = getAll();
  const student = { id: uuidv4(), ...data };
  all.push(student);
  localStorage.setItem('gymmanager-students', JSON.stringify(all));
  return student;
}

// DEPOIS — studentService.ts (API REST)
async function getAll(): Promise<Student[]> {
  const res = await fetch('/api/students', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

async function create(data: Partial<Student>): Promise<Student> {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
}
```

### Passo 4 — Implementar autenticação segura

```typescript
// Backend — auth.controller.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Usuário não encontrado');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Senha incorreta');

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return { token, user: { id: user.id, name: user.name, role: user.role } };
}

async function register(data: { name: string; email: string; password: string; role: string }) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: { ...data, password: hashedPassword },
  });
}
```

### Stack Recomendada para o Backend

| Componente | Opção recomendada | Alternativa |
|---|---|---|
| **Runtime** | Node.js | Deno |
| **Framework** | Express | Fastify, NestJS |
| **ORM** | Prisma | TypeORM, Drizzle |
| **Banco** | PostgreSQL | MySQL |
| **Auth** | bcrypt + JWT | Passport.js |
| **Validação** | Zod | Joi, Yup |
| **Deploy** | Railway, Render | AWS, Vercel |

### Alternativa: Next.js Full-Stack

Ao invés de criar um backend separado, é possível migrar o frontend para **Next.js** e usar:
- **Server Actions** ou **API Routes** para a lógica de backend
- **Prisma** para acesso ao banco
- **NextAuth.js** para autenticação

Isso elimina a necessidade de dois projetos separados.

---

## 📊 Diagrama de Entidades

```
┌──────────┐     ┌──────────────┐     ┌──────────────────┐
│   User   │────▶│   Workout    │◀────│     Student      │
│          │  1:N│              │  N:1 │                  │
│ id       │     │ id           │      │ id               │
│ name     │     │ studentId    │      │ userId (opt)     │
│ email    │     │ instructorId │      │ name, email      │
│ password │     │ name         │      │ weight, height   │
│ role     │     │ muscleGroup  │      │ goal, active     │
└──────┬───┘     │ exercises[]  │      └────────┬─────────┘
       │         └──────────────┘               │
       │                                        │
       ▼                                        ▼
┌──────────────┐                    ┌───────────────────┐
│ ActivityLog  │                    │ PhysicalProgress  │
│              │                    │                   │
│ id           │                    │ id                │
│ userId       │                    │ studentId         │
│ type         │                    │ weight, bodyFat   │
│ description  │                    │ muscleMass, bmi   │
│ timestamp    │                    │ recordedAt        │
└──────────────┘                    └───────────────────┘
```

---

*Última atualização: Maio 2026*
