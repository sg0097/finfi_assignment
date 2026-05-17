const dotenv = require('dotenv');
dotenv.config();
const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log('Gemini API Key:', process.env.GEMINI_API_KEY);
function getSchema(type) {
  const itemSchema = {
    type: Type.OBJECT,
    properties: {
      itemCode: { type: Type.STRING },
      description: { type: Type.STRING },
      quantity: { type: Type.INTEGER },
    },
    required: ['itemCode', 'quantity'],
  };

  if (type === 'po') {
    return {
      type: Type.OBJECT,
      properties: {
        poNumber: { type: Type.STRING },
        poDate: { type: Type.STRING },
        vendorName: { type: Type.STRING },
        items: { type: Type.ARRAY, items: itemSchema }
      },
      required: ['poNumber', 'poDate', 'items']
    };
  }
  
  if (type === 'grn') {
    return {
      type: Type.OBJECT,
      properties: {
        grnNumber: { type: Type.STRING },
        poNumber: { type: Type.STRING },
        grnDate: { type: Type.STRING },
        items: { 
          type: Type.ARRAY, 
          items: {
            ...itemSchema,
            properties: { 
              ...itemSchema.properties, 
              receivedQuantity: { type: Type.INTEGER } 
            },
            required: ['itemCode', 'receivedQuantity']
          } 
        }
      },
      required: ['grnNumber', 'poNumber', 'items']
    };
  }

  if (type === 'invoice') {
    return {
      type: Type.OBJECT,
      properties: {
        invoiceNumber: { type: Type.STRING },
        poNumber: { type: Type.STRING },
        invoiceDate: { type: Type.STRING },
        items: { type: Type.ARRAY, items: itemSchema }
      },
      required: ['invoiceNumber', 'poNumber', 'items']
    };
  }
}

async function parseDocument(fileBuffer, mimeType, documentType) {
  const schema = getSchema(documentType);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType
        }
      },
      `Extract structured details strictly matching the provided JSON validation layout from this business ${documentType.toUpperCase()}. Ensure numbers are extracted strictly as integers.`
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    }
  });

  return JSON.parse(response.text);
}

module.exports = { parseDocument };