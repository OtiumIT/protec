# Workers - Processamento Python

Workers para processamento pesado, jobs agendados e integrações.

## Estrutura

```
workers/
├── src/
│   ├── main.py          # Entry point
│   ├── workers/         # Workers específicos
│   └── utils/           # Utilitários
├── requirements.txt     # Dependências Python
└── README.md
```

## Setup

```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt
```

## Desenvolvimento

```bash
# Rodar worker
python src/main.py
```
