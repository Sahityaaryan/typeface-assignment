const Transaction = require('../models/Transaction');
const { parsePdfBuffer } = require('../utils/pdfParser');
const { ocrSpace } = require('ocr-space-api-wrapper');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');

const parseDate = (dateStr) => {
  console.log(`Attempting to parse date: ${dateStr}`);
  const formats = [
    { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, parser: (match) => new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`) },
    { regex: /(\d{2})(\d{2})(\d{4})/, parser: (match) => new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`) },
    { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, parser: (match) => new Date(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`) },
    { regex: /\d{6,8}/, parser: (match) => {
      const str = match[0].replace(/[^\d]/g, '');
      if (str.length === 8) {
        const year = str.slice(4, 8);
        const month = str.slice(2, 4);
        const day = str.slice(0, 2);
        const date = new Date(`${year}-${month}-${day}`);
        return !isNaN(date) ? date : null;
      }
      return null;
    }}
  ];
  for (const { regex, parser } of formats) {
    const match = dateStr.match(regex);
    if (match) {
      const date = parser(match);
      if (!isNaN(date)) {
        console.log(`Parsed date: ${dateStr} -> ${date.toISOString()}`);
        return date;
      }
    }
  }
  console.warn(`Invalid date format: ${dateStr}`);
  return null;
};

exports.addTransaction = async (req, res) => {
  try {
    const { type, amount, category, date, description } = req.body;
    if (!type || !amount || !category || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const transaction = new Transaction({
      userId: req.user.id,
      type,
      amount: parseFloat(amount),
      category,
      date,
      description,
    });
    await transaction.save();
    res.status(201).json({ message: 'Transaction added', transaction });
  } catch (error) {
    console.error('Error adding transaction:', error.message);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user.id };
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const transactions = await Transaction.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Transaction.countDocuments(query);
    res.json({ transactions, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.file;
    let text;
    const tempPath = path.join(__dirname, `temp_${Date.now()}.${file.mimetype === 'application/pdf' ? 'pdf' : 'png'}`);
    if (file.mimetype.startsWith('image')) {
      try {
        console.log('Processing image with OCR.Space, buffer length:', file.buffer.length, 'mimetype:', file.mimetype);
        const processedBuffer = await sharp(file.buffer)
          .rotate()
          .normalize()
          .threshold(70)
          .resize(5500)
          .gamma(1.3)
          .toFormat('png')
          .toBuffer();
        await fs.writeFile(tempPath, processedBuffer);
      } catch (error) {
        console.error('OCR.Space error:', error.message, error.stack);
        throw new Error(`OCR failed for image: ${error.message}`);
      }
    } else if (file.mimetype === 'application/pdf') {
      await fs.writeFile(tempPath, file.buffer);
    } else {
      await fs.unlink(tempPath).catch(() => {});
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const ocrResult = await ocrSpace(tempPath, {
      apiKey: process.env.OCR_API_KEY,
      language: 'eng',
      isOverlayRequired: false,
    });

    await fs.unlink(tempPath).catch(err => console.error('Failed to delete temp file:', err.message));

    text = ocrResult.ParsedResults[0].ParsedText.trim();
    console.log('OCR.Space completed successfully, raw text:', text, 'text length:', text.length);
    const transactions = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let dates = [], descriptions = [], categories = [], amounts = [];
    let currentSection = '';
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase() === 'date') currentSection = 'dates';
      else if (trimmedLine.toLowerCase() === 'description') currentSection = 'descriptions';
      else if (trimmedLine.toLowerCase() === 'category') currentSection = 'categories';
      else if (trimmedLine.toLowerCase() === 'amount') currentSection = 'amounts';
      else if (currentSection) {
        if (currentSection === 'dates' && parseDate(trimmedLine)) dates.push(trimmedLine);
        else if (currentSection === 'descriptions') descriptions.push(trimmedLine);
        else if (currentSection === 'categories') categories.push(trimmedLine);
        else if (currentSection === 'amounts') {
          const cleanedAmount = parseFloat(trimmedLine.replace(/[^0-9.]/g, '') || 0);
          if (cleanedAmount > 0) amounts.push(cleanedAmount);
        }
      }
    }
    const validDates = dates.filter(date => parseDate(date));
    console.log('Dates (raw):', dates);
    console.log('Valid Dates:', validDates);
    console.log('Descriptions:', descriptions);
    console.log('Categories:', categories);
    console.log('Amounts:', amounts);
    const maxTransactions = Math.min(validDates.length, descriptions.length, categories.length, amounts.length);
    for (let i = 0; i < maxTransactions; i++) {
      const date = parseDate(validDates[i]);
      if (date) {
        transactions.push({
          userId: req.user.id,
          type: 'expense',
          amount: amounts[i] || 0,
          category: categories[i] || 'Unknown',
          date,
          description: descriptions[i] || 'Imported from uploaded receipt',
        });
        console.log(`Added transaction: Amount=₹${amounts[i] || 0}, Date=${validDates[i]}, Category=${categories[i] || 'Unknown'}, Description=${descriptions[i] || 'Imported from uploaded receipt'}`);
      } else {
        console.warn(`Skipping transaction due to invalid date: ${validDates[i]}`);
      }
    }
    console.log('Resulting transactions:', transactions);
    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No valid transactions found in receipt' });
    }
    await Transaction.insertMany(transactions);
    res.status(201).json({ message: `Receipt uploaded successfully: ${transactions.length} transactions`, transaction: transactions });
  } catch (error) {
    console.error('Error processing receipt:', error.message, error.stack);
    res.status(500).json({ error: `Failed to upload receipt: ${error.message}` });
  }
};

exports.uploadTransactionHistory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.file;
    let text;
    if (file.mimetype === 'application/pdf') {
      text = await parsePdfBuffer(file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF' });
    }
    console.log('Extracted transaction history text:', text);
    const lines = text
      .replace(/(\r\n|\r|\n)/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    console.log('Split lines:', lines);
    const transactions = [];
    const lineRegex = /(\d{1,2}\/\d{1,2}\/\d{4})\s+([^\s].*?)(?:\s+([^\s].*?))?\s+₹(\d+\.\d{2}(?!\d)|\d+)/g;
    const lineMatches = [...text.matchAll(lineRegex)];
    if (lineMatches.length > 0) {
      for (const match of lineMatches) {
        const date = parseDate(match[1]);
        if (!date) {
          console.warn(`Skipping transaction due to invalid date: ${match[1]}`);
          continue;
        }
        const category = match[2].trim();
        const description = match[3] ? match[3].trim() : 'Imported from uploaded document';
        const amount = parseFloat(match[4]);
        transactions.push({
          userId: req.user.id,
          type: 'expense',
          amount,
          category,
          date,
          description,
        });
        console.log(`Added transaction: Amount=₹${amount}, Date=${match[1]}, Category=${category}, Description=${description}`);
      }
    } else {
      console.log('No full line matches, splitting by date pattern');
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/g;
      const dateMatches = [...text.matchAll(dateRegex)];
      if (dateMatches.length === 0) {
        return res.status(400).json({ error: 'No dates found in PDF' });
      }
      let currentPos = 0;
      const newLines = [];
      for (const match of dateMatches) {
        const datePos = match.index;
        const lineText = text.substring(currentPos, datePos + match[0].length + 50).trim();
        if (lineText.length > 0) newLines.push(lineText);
        currentPos = datePos + match[0].length;
      }
      const lastLine = text.substring(currentPos).trim();
      if (lastLine.length > 0) newLines.push(lastLine);
      console.log('Re-split lines:', newLines);
      for (const line of newLines) {
        console.log('Processing line:', line);
        const lineMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+([^\s].*?)(?:\s+([^\s].*?))?\s+₹(\d+\.\d{2}(?!\d)|\d+)/);
        if (!lineMatch) {
          console.log(`Skipping line: No valid transaction data in "${line}"`);
          continue;
        }
        const date = parseDate(lineMatch[1]);
        if (!date) {
          console.warn(`Skipping transaction due to invalid date: ${lineMatch[1]}`);
          continue;
        }
        const category = lineMatch[2].trim();
        const description = lineMatch[3] ? lineMatch[3].trim() : 'Imported from uploaded document';
        const amount = parseFloat(lineMatch[4]);
        transactions.push({
          userId: req.user.id,
          type: 'expense',
          amount,
          category,
          date,
          description,
        });
        console.log(`Added transaction: Amount=₹${amount}, Date=${lineMatch[1]}, Category=${category}, Description=${description}`);
      }
    }
    if (transactions.length === 0) {
      return res.status(400).json({ error: 'No valid transactions found in PDF' });
    }
    await Transaction.insertMany(transactions);
    res.status(201).json({ message: `Transaction history imported: ${transactions.length} transactions`, count: transactions.length });
  } catch (error) {
    console.error('Error processing transaction history:', error.message);
    res.status(500).json({ error: `Failed to import transaction history: ${error.message}` });
  }
};

exports.addBulkTransactions = async (req, res) => {
  try {
    const bulkTransactions = req.body.map(t => ({
      ...t,
      userId: req.user.id,
      type: t.type || 'expense',
      amount: parseFloat(t.amount) || 0,
      category: t.category || 'Unknown',
      date: new Date(t.date) || new Date(),
      description: t.description || 'Imported from AI-Enhanced OCR',
    }));
    await Transaction.insertMany(bulkTransactions);
    res.status(201).json({ message: `Bulk transactions added: ${bulkTransactions.length} transactions` });
  } catch (error) {
    console.error('Error adding bulk transactions:', error.message);
    res.status(500).json({ error: 'Failed to add bulk transactions' });
  }
};

exports.uploadReceiptAI = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const file = req.file;
    let base64Data, mimeType;

    if (file.mimetype.startsWith('image')) {
      // Images: Convert to PNG base64 (pure JS with Sharp)
      const buffer = await sharp(file.buffer)
        .toFormat('png')
        .toBuffer();
      base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      mimeType = 'image/png';
    } else if (file.mimetype === 'application/pdf') {
      // PDFs: Direct base64 encode (platform-independent; Gemini handles natively)
      base64Data = btoa(String.fromCharCode(...new Uint8Array(file.buffer)));
      mimeType = 'application/pdf';
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Extract transactions from this image or PDF and return ONLY a valid JSON array of objects. Each object must have the fields: date (YYYY-MM-DD), description, category, amount (numeric). Ignore totals or summaries. Do not include any text outside the JSON array.',
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('No valid text response from Gemini API');
    }

    let parsedJson = textResponse.trim();
    if (parsedJson.startsWith('```json') && parsedJson.endsWith('```')) {
      parsedJson = parsedJson.replace(/```json\n|\n```/g, '').trim();
    }
    const pageTransactions = JSON.parse(parsedJson); // For PDFs, this handles all pages

    if (pageTransactions.length === 0) {
      return res.status(400).json({ error: 'No transactions extracted from the file' });
    }

    await Transaction.insertMany(pageTransactions.map(t => ({
      ...t,
      userId: req.user.id,
      type: 'expense',
      description: t.description || 'Imported from AI-Enhanced OCR',
    })));

    res.status(201).json({ message: `Receipt uploaded successfully: ${pageTransactions.length} transactions`, count: pageTransactions.length });
  } catch (error) {
    console.error('AI-enhanced OCR error:', error.message, error.response?.data);
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'Authentication error. Please check your Gemini API key.' });
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: 'API quota exceeded. Please check your Gemini billing and quota.' });
    } else if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'Invalid JSON response from Gemini API.' });
    } else {
      res.status(500).json({ error: `Failed to process with AI-Enhanced OCR: ${error.message}` });
    }
  }
};