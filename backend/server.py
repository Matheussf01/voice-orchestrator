from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------
# ROTAS DA API
# ---------------------

@app.get("/{slug}/api/signed-url")
async def get_signed_url(slug: str):
    try:
        # Conecta no banco e busca o agent_id com base no slug
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME")
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT elevenlabs_voice_id FROM assistentes WHERE slug = %s", (slug,))
        result = cursor.fetchone()
        conn.close()

        if not result:
            raise HTTPException(status_code=404, detail="Assistente não encontrado")

        agent_id = result["elevenlabs_voice_id"]
        xi_api_key = os.getenv("XI_API_KEY")

        if not xi_api_key:
            raise HTTPException(status_code=500, detail="XI_API_KEY não configurada")

        # Requisição para a ElevenLabs
        url = f"https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id={agent_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={"xi-api-key": xi_api_key}
            )
            response.raise_for_status()
            data = response.json()
            return {"signedUrl": data["signed_url"]}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {str(err)}")
    except httpx.HTTPError:
        raise HTTPException(status_code=500, detail="Falha ao acessar a API da ElevenLabs")


@app.get("/{slug}/api/getAgentId")
def get_unsigned_url(slug: str):
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME")
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT elevenlabs_voice_id FROM assistentes WHERE slug = %s", (slug,))
        result = cursor.fetchone()
        conn.close()

        if result:
            return {"agentId": result["elevenlabs_voice_id"]}
        else:
            raise HTTPException(status_code=404, detail="Assistente não encontrado")

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {str(err)}")


@app.get("/{slug}")
def get_assistente(slug: str):
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME")
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM assistentes WHERE slug = %s", (slug,))
        assistente = cursor.fetchone()
        conn.close()

        if assistente:
            return JSONResponse(content=assistente)
        else:
            raise HTTPException(status_code=404, detail="Assistente não encontrado")

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {str(err)}")

# ---------------------
# FRONTEND
# ---------------------

# Serve arquivos estáticos (JS, CSS, etc.)
app.mount("/static", StaticFiles(directory="dist"), name="static")

# Serve a index.html principal
@app.get("/")
async def serve_root():
    return FileResponse("dist/index.html")
