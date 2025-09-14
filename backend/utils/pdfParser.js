const pdfParse = require('pdf-parse');
const { ocrSpace } = require('ocr-space-api-wrapper');
const fs = require('fs').promises;
const path = require('path');

async function parsePdfBuffer(pdfBuffer) {
  try {
    // First: Pure JS text extraction
    const pdfData = await pdfParse(pdfBuffer);
    let text = pdfData.text.trim();
    console.log('Direct PDF parsing completed, text length:', text.length);

    // Fallback: If no text (scanned PDF), use OCR.Space directly on PDF
    if (!text || text.trim().length === 0) {
      console.log('No text extracted from PDF, attempting OCR with OCR.Space');
      const tempPath = path.join(__dirname, `temp_pdf_${Date.now()}.pdf`);
      await fs.writeFile(tempPath, pdfBuffer);
      const ocrResult = await ocrSpace(tempPath, {
        apiKey: process.env.OCR_API_KEY,
        language: 'eng',
        isOverlayRequired: false,
      });
      await fs.unlink(tempPath).catch(err => console.error('Failed to delete temp file:', err.message));
      text = ocrResult.ParsedResults[0].ParsedText.trim();
      console.log('OCR.Space for PDF completed, text length:', text.length);
    }
    return text;
  } catch (error) {
    console.error('PDF parsing failed:', error.message, error.stack);
    throw new Error('Failed to parse PDF');
  }
}

module.exports = { parsePdfBuffer };