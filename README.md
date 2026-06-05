# Hemodinks Front

Aplicacao web React/Vite para administradores, medicos e pacientes do Hemodinks.

## Stack

- React 19
- TypeScript
- Vite
- Vitest
- Testing Library
- lucide-react

## URLs

| Recurso | URL |
| --- | --- |
| Front local | `http://localhost:5173` |
| Front producao | `https://hemodinks-saude.vercel.app` |
| API local | `http://localhost:5000` |
| Swagger API | `http://localhost:5000/swagger` |
| Scalar API | `http://localhost:5000/scalar` |

## Configuracao

Variavel principal:

```text
VITE_API_URL=http://localhost:5000
```

Para producao:

```text
VITE_API_URL=https://<api-publica>
```

## Executar

```powershell
npm ci
npm run dev
```

## Testar e buildar

```powershell
npm test
npm run build
```

## Funcionalidades

- login com JWT
- troca/reset de senha
- dashboard
- CRUD de usuarios
- CRUD de pacientes
- upload e exclusao de arquivos
- popup CBHPM com paginacao e filtros por codigo, procedimento e porte
- selecao de procedimento CBHPM compondo o payload do cadastro/edicao de paciente
- layout responsivo para smartphone, tablet, notebook e desktop

## Integracao CBHPM

O frontend chama:

```http
GET /api/cbhpm?page=1&pageSize=10&codigo=&procedimento=&porte=
Authorization: Bearer <token>
```

Ao selecionar um item, o formulario de paciente recebe:

- `cbhpmCodigo`
- `cbhpmPorte`
- `procedimento`

O backend valida o codigo no cache/tabela CBHPM antes de salvar.

## Deploy

Detalhes em [DEPLOYMENT.md](./DEPLOYMENT.md).
