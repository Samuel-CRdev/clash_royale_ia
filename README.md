# Clash Royale IA Deckbuilder

Projeto completo com:
- Backend Flask
- API Clash Royale
- Gemini AI
- Frontend HTML/CSS/JS
- Deploy via Render

## Instalação

cd backend
pip install -r requirements.txt
python app.py

## Rodar frontend

Abra frontend/index.html

## Deploy Render

- Crie serviço Web → selecione pasta backend/
- Build command: pip install -r requirements.txt
- Start command: gunicorn app:app
- Configure env vars:
    CLASH_API_TOKEN=xxxxx
    GEMINI_API_KEY=xxxxx
