const express = require('express');
const multer = require('multer');
const Document = require('../model/Document');
const MatchResult = require('../model/MatchResult');
const { parseDocument } = require('../service/geminiParser');
const { runMatchEngine } = require('../service/matchEngine');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.get('/test', (req, res) => {
    res.send('Hello, World!');
});

// 1. Upload API
router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    const { documentType } = req.body;
    if (!req.file || !documentType) {
      return res.status(400).json({ error: 'Missing file asset payload or documentType assignment.' });
    }

    const parsedData = await parseDocument(req.file.buffer, req.file.mimetype, documentType);
    const poNumber = parsedData.poNumber;

    if (!poNumber) {
      return res.status(422).json({ error: 'Failed to extract a valid poNumber identifier correlation context.' });
    }

    const savedDoc = await Document.create({
      documentType,
      poNumber,
      extractedData: parsedData
    });

    // Fire state re-evaluation matrix synchronously 
    await runMatchEngine(poNumber);

    res.status(201).json({ 
      message: 'Document uploaded and integrated successfully.', 
      documentId: savedDoc._id, 
      poNumber 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Retrieval API By Document ID
router.get('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Specified extraction reference document not found.' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Engine Match Output API By PO Number
router.get('/match/:poNumber', async (req, res) => {
  try {
    const { poNumber } = req.params;
    const documents = await Document.find({ poNumber });
    const matchStatusRecord = await MatchResult.findOne({ poNumber });

    res.json({
      poNumber,
      associatedDocumentsCount: documents.length,
      matchStatus: matchStatusRecord ? matchStatusRecord.status : 'insufficient_documents',
      mismatchReasons: matchStatusRecord ? matchStatusRecord.mismatches : [],
      documents: documents.map(d => ({ 
        id: d._id, 
        type: d.documentType, 
        data: d.extractedData 
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;