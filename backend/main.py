from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from datetime import datetime
from contextlib import asynccontextmanager

from backend.routes import predict

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MODEL_PATH = "models/health_model.pkl"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info("Starting IoT Health Monitor API")
    logger.info("=" * 50)
    
    if os.path.exists(MODEL_PATH):
        logger.info(f"ML model found at {MODEL_PATH}")
    else:
        logger.warning(f"ML model not found at {MODEL_PATH}. Using rule-based fallback.")
    
    yield
    
    logger.info("Shutting down IoT Health Monitor API")


app = FastAPI(
    title="IoT Health Monitor API",
    description="Real-time stress and health monitoring system with ML inference",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    
    logger.info(f"Request: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        process_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"Response: {response.status_code} ({process_time:.2f}ms)")
        return response
    except Exception as e:
        process_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.error(f"Error: {str(e)} ({process_time:.2f}ms)")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "timestamp": datetime.now().isoformat()}
        )


app.include_router(predict.router, prefix="/api/v1", tags=["Prediction"])


@app.get("/")
async def root():
    return {
        "service": "IoT Health Monitor API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/status")
async def status():
    model_exists = os.path.exists(MODEL_PATH)
    
    return {
        "status": "healthy",
        "model_loaded": model_exists,
        "timestamp": datetime.now().isoformat(),
        "uptime": "N/A"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
