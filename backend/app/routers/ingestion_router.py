from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models import SummarizeDocResponse, ExpandOneLinerRequest, ExpandOneLinerResponse
from app.engines.ingestion import summarize_document, expand_oneliner

router = APIRouter(prefix="/api", tags=["ingestion"])

@router.post("/summarize-doc", response_model=SummarizeDocResponse)
async def summarize_doc_endpoint(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
    return summarize_document(contents, file.filename)

@router.post("/expand-oneliner", response_model=ExpandOneLinerResponse)
async def expand_oneliner_endpoint(payload: ExpandOneLinerRequest):
    return expand_oneliner(payload.raw_text)
