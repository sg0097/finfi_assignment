const mongoose = require('mongoose');

const MatchResultSchema = new mongoose.Schema({
  poNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['matched', 'partially_matched', 'mismatch', 'insufficient_documents'], 
    default: 'insufficient_documents' 
  },
  mismatches: [{ type: String }],
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model('MatchResult', MatchResultSchema);