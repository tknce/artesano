# AGENTS.md

## Project Overview

CROCINI (아르테사노) — 40년 경력 장인의 프리미엄 가죽 브랜드 쇼핑몰.
Brownfield project with existing Express.js backend, MySQL DB, Cloudinary image hosting, deployed on Railway.

## Language Preference

- Respond in Korean except for technical terms
- Technical terms remain in English (e.g., API, function, class)

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (server-side template injection via partials)
- **Backend**: Node.js + Express.js
- **Database**: MySQL (Railway hosted)
- **Image Storage**: Cloudinary
- **Deployment**: Railway
- **Auth**: Session-based (express-session + MySQL store)

## Workflow Instructions

### AIDLC Workflow

Follow the AIDLC workflow defined in `.kiro/steering/aws-aidlc-rules/core-workflow.md`:

1. **Inception Phase**: Requirements analysis, design, planning
   - Workspace Detection (always)
   - Reverse Engineering (brownfield — this project)
   - Requirements Analysis (always)
   - User Stories (conditional)
   - Workflow Planning (always)
   - Application Design (conditional)
   - Units Generation (conditional)

2. **Construction Phase**: Detailed design and code generation
   - Functional Design (conditional, per-unit)
   - NFR Requirements (conditional, per-unit)
   - NFR Design (conditional, per-unit)
   - Infrastructure Design (conditional, per-unit)
   - Code Generation (always, per-unit)
   - Build and Test (always)

3. **Operations Phase**: Deployment and operations (future expansion)

### Critical Rules

- **User approval required at every step**: Must get user confirmation before proceeding
- **Load detailed rules**: Read corresponding rule files from `.kiro/aws-aidlc-rule-details/` before executing each stage
- **Load common rules**: At workflow start, load:
  - `common/process-overview.md`
  - `common/session-continuity.md`
  - `common/content-validation.md`
  - `common/question-format-guide.md`
- **Content validation**: Validate Mermaid diagrams, ASCII art before file creation
- **Audit logging**: Record all user inputs and AI responses in `aidlc-docs/audit.md`

## Directory Structure

```
artesano/
├── .kiro/
│   ├── agents/                     # Custom agent config (CLI)
│   ├── steering/                   # AIDLC workflow rules
│   └── aws-aidlc-rule-details/     # Detailed rule docs
├── aidlc-docs/                     # AIDLC documentation only
│   ├── inception/
│   ├── construction/
│   ├── operations/
│   ├── aidlc-state.md
│   └── audit.md
├── requirements/                   # Project requirements & constraints
├── backend/                        # Express.js API server
├── partials/                       # HTML partials (nav, footer)
├── images/                         # Static images
├── *.html                          # Frontend pages
├── style.css / admin.css           # Stylesheets
├── script.js / admin.js            # Frontend scripts
└── AGENTS.md                       # This file
```

## Code Generation Guidelines

### Application Code Location

- **Application code**: Generate in workspace root (never in `aidlc-docs/`)
- **Documentation**: Generate only in `aidlc-docs/` directory

## Session Continuity

- Check `aidlc-docs/aidlc-state.md` when resuming existing session
- Load artifacts and decisions from previous stages
- Review previous conversation context from audit log

## Security Considerations

- Never include sensitive info (API keys, passwords) directly in code
- Use environment variables (Railway Variables)
- Session secret via `SESSION_SECRET` env var
- Admin credentials via `ADMIN_USER` / `ADMIN_PASSWORD` env vars
