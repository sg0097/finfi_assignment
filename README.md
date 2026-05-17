# 3-Way Match Procurement System

A Node.js and Express backend system designed to automate the reconciliation of procurement documents. The system uses Gemini 2.5 Flash to extract structured data from PDF documents and applies deterministic JavaScript logic to perform an automated Three-Way Match.

---

## 🚀 Quick Start Guide

### 1. Environment Setup
Create a .env file in your root directory and populate it with your configuration:

PORT=3000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key

### 2. Install and Run
# Install dependencies
npm install

# Run the application in development mode
npm run dev

### 3. API Documentation

#### Health Check
* URL: /api/test
* Method: GET
* Response: Hello world

#### Document Upload
Uploads a procurement document (Invoice, Purchase Order, or Goods Receipt Note). The pipeline supports files uploaded in any order.

* URL: /api/documents/upload
* Method: POST
* Content-Type: multipart/form-data
* Body Parameters:
  * documentType: "invoice" | "po" | "grn"
  * file: [PDF File]

#### Get Document Details
* URL: /api/documents/:documentId
* Method: GET

#### Get Match Results (Reconciliation)
* URL: /api/match/:poNumber
* Method: GET

---

## 🏗️ Architectural Approach

The system decouples document uploading from the document matching process. 

Instead of relying on basic optical character recognition (OCR) text streams, the system utilizes Gemini 2.5 Flash to parse PDF binaries directly into strictly typed JSON structures. This approach ensures highly reliable and structured data preservation before database insertion.

### Order-Independent Ingestion
Supply chain documents often arrive in non-sequential sequences (e.g., an invoice arriving before a warehouse tally). To support this, the ingestion pipeline is completely order-independent. Documents are grouped dynamically via a shared poNumber. 

If only 1 or 2 required documents are available, the match API returns:
{
  "status": "insufficient_documents"
}
The reconciliation logic evaluates the data status dynamically whenever the match endpoint is queried or a new document arrives.

---

## 📊 Ingestion Pipeline & Data Model

### Parsing Flow
[PDF File Stream] ──> [Multer Memory Buffer] ──> [Base64 Conversion] ──> [Gemini 2.5 Flash + JSON Schema] ──> [Structured MongoDB Save]

### MongoDB Schema
const DocumentSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, index: true, trim: true },
  type: { type: String, required: true, enum: ['po', 'grn', 'invoice'] },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

---

## 🛠️ Matching Logic

Reconciliation is explicitly handled via deterministic JavaScript logic rather than AI to ensure audit-level accuracy, consistency, and traceability.

1. Document Verification: Verifies the existence of all three core documents (po, grn, invoice) for a given poNumber.
2. Duplicate Detection: Flags instances where multiple files of the same type are uploaded under the same poNumber.
3. SKU Validation: Validates item codes across records. If an item exists on the invoice but is absent from the Purchase Order, the system flags the error code: item_missing_in_po.

---

## 💡 Engineering Tradeoffs

* In-Memory Buffering vs. Disk Storage: Utilizing multer.memoryStorage() optimizes processing throughput and eliminates local disk I/O overhead. This trades short-term RAM utilization for faster overall execution speed.
* Strict SKU Matching: Matches are enforced through exact string comparisons on SKU/item codes. This guarantees absolute compliance but flags minor formatting variations across systems as explicit mismatches.

---

## 🔮 Future Improvements

* Semantic SKU Mapping: Integrate vector embedding similarity matching to resolve and map distinct vendor and internal SKU string definitions based on semantic item descriptions.
* Cloud-Based File Streaming: Transition from memory buffers to direct cloud streams (e.g., AWS S3) to significantly lower server memory overhead during large multi-page uploads.
* Asynchronous Processing Workers: Offload the matching engine and AI parsing tasks to background workers via message brokers (e.g., BullMQ or RabbitMQ) to sustain sub-second API responsiveness during spikes in traffic.