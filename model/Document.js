const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  documentType: { 
    type: String, 
    enum: ['po', 'grn', 'invoice'], 
    required: true 
  },
  poNumber: { 
    type: String, 
    required: true, 
    index: true 
  },
  extractedData: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);