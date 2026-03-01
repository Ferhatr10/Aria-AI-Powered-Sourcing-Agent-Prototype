import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Any

from langchain_docling import DoclingLoader
from langchain_docling.loader import ExportType          # added
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

from docling.chunking import HybridChunker               # added
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

from schema import Pass1Extraction, SupplierSearchProfile
from prompt import (
    PASS1_SYSTEM_PROMPT, PASS1_USER_PROMPT,
    PASS2_SYSTEM_PROMPT, PASS2_USER_PROMPT,
)

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
PASS1_MODEL   = "qwen2.5:14b"
PASS2_MODEL   = "qwen2.5:14b"
EMBED_MODEL   = "sentence-transformers/all-MiniLM-L6-v2"   # tokenizer only
MAX_CHUNKS    = 100         # safety limit for long documents
MAX_TOKENS    = 1500        # HybridChunker token limit


# ─────────────────────────────────────────────────────────────────────────────
# DOCLING — speed-optimized converter (no OCR)
# ─────────────────────────────────────────────────────────────────────────────
def get_fast_converter() -> DocumentConverter:
    """Configures Docling without OCR (high speed). Ideal for native PDFs."""
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False

    return DocumentConverter(format_options={
        InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
    })


# ─────────────────────────────────────────────────────────────────────────────
# PASS 1 HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def merge_pass1_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merges Pass 1 results.
    - Singular fields → takes last non-null value
    - List fields → union + deduplicate
    """
    merged: Dict[str, Any] = {
        "component_name": None,
        "material_specifications": [],
        "certifications_mentioned": [],
        "weight_and_dimensions": None,
        "surface_treatments": [],
    }

    for res in results:
        if res.get("component_name"):
            merged["component_name"] = res["component_name"]
        if res.get("weight_and_dimensions"):
            merged["weight_and_dimensions"] = res["weight_and_dimensions"]

        for field in ("material_specifications", "certifications_mentioned", "surface_treatments"):
            vals = res.get(field)
            if vals and isinstance(vals, list):
                merged[field].extend(vals)

    # Deduplicate
    for key in ("material_specifications", "certifications_mentioned", "surface_treatments"):
        merged[key] = list(set(merged[key]))

    return merged


# ─────────────────────────────────────────────────────────────────────────────
# CORE — Two-Pass Extraction
# ─────────────────────────────────────────────────────────────────────────────
def extract_with_langchain(file_bytes: bytes, ollama_url: str) -> dict:
    """
    Two-Pass Agentic RAG:
        Pass 1 (qwen2.5:7b)  — Map:    Extract raw data from each chunk
        Pass 2 (qwen2.5:32b) — Reduce: Synthesize raw data into SupplierSearchProfile

    CHANGE (old → new):
        MARKDOWN + MarkdownHeaderTextSplitter
        → DOC_CHUNKS + HybridChunker

    Why?
        HybridChunker preserves heading hierarchy, table context, and token limits
        simultaneously. Table rows and technical values are no longer split mid-way.
    """
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = Path(tmp.name)

    try:
        # ── 1. LOAD — DOC_CHUNKS modu ────────────────────────────────────────
        converter = get_fast_converter()
        loader = DoclingLoader(
            file_path=str(tmp_path),
            converter=converter,
            export_type=ExportType.DOC_CHUNKS,          # ← instead of MARKDOWN
            chunker=HybridChunker(
                tokenizer=EMBED_MODEL,                  # tokenizer for token limit
                max_tokens=MAX_TOKENS,
                merge_peers=True,                       # merge neighboring small chunks
            ),
        )
        docs = loader.load()
        log.info(f"Document loaded: {len(docs)} chunks")

        # ── 2. PASS 1 — THE EXTRACTOR (Map Phase) ────────────────────────────
        extractor_llm = ChatOllama(
            model=PASS1_MODEL,
            base_url=ollama_url,
            format="json",
            temperature=0,
        )
        structured_extractor = extractor_llm.with_structured_output(Pass1Extraction)
        extractor_chain = (
            ChatPromptTemplate.from_messages([
                ("system", PASS1_SYSTEM_PROMPT),
                ("user",   PASS1_USER_PROMPT),
            ])
            | structured_extractor
        )

        raw_results: List[Dict[str, Any]] = []
        for idx, doc in enumerate(docs[:MAX_CHUNKS]):
            log.info(f"Pass 1 — chunk {idx + 1}/{min(len(docs), MAX_CHUNKS)} "
                     f"({len(doc.page_content)} chars)")
            try:
                res = extractor_chain.invoke({"markdown_chunk_text": doc.page_content})
                raw_results.append(res.model_dump())
            except Exception as e:
                log.warning(f"  Chunk {idx} skipped: {e}")

        # ── 3. MERGE ──────────────────────────────────────────────────────────
        merged_data = merge_pass1_results(raw_results)
        log.info(f"Pass 1 completed — {len(raw_results)} chunks merged.")

        # ── 4. PASS 2 — THE ORGANIZER (Reduce Phase) ─────────────────────────
        organizer_llm = ChatOllama(
            model=PASS2_MODEL,
            base_url=ollama_url,
            format="json",
            temperature=0.1,
        )
        structured_organizer = organizer_llm.with_structured_output(SupplierSearchProfile)
        organizer_chain = (
            ChatPromptTemplate.from_messages([
                ("system", PASS2_SYSTEM_PROMPT),
                ("user",   PASS2_USER_PROMPT),
            ])
            | structured_organizer
        )

        log.info("Pass 2 starting — Synthesizing SupplierSearchProfile…")
        final_profile: SupplierSearchProfile = organizer_chain.invoke(
            {"merged_json_from_pass_1": str(merged_data)}
        )

        return final_profile.model_dump()

    except Exception as e:
        log.error(f"Two-Pass Extraction error: {e}")
        raise
    finally:
        tmp_path.unlink(missing_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINT  (api.py and handler.py depend on this — do not change)
# ─────────────────────────────────────────────────────────────────────────────
def process_rfq(file_bytes: bytes, ollama_url: str, model: str = None) -> dict:
    """Main entry point. Called by api.py and handler.py."""
    return extract_with_langchain(file_bytes, ollama_url)