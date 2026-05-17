//how to setup the project
Quick Start Guide

1. Environmental Setup
Create a .env file in your root directory:

PORT=3000
MONGODB_URI=add_your_mongodb_url here 
GEMINI_API_KEY=add_your_gemini_api_key

2. Install and Run

1.npm install
2.npm run dev

3. Test the api ->

1.test api -> Get: http://localhost:3000/api/test
               Response -> Hello world

2.Upload service -> 

  upload invoice pdf file
  POST: http://localhost:3000/api/documents/upload  
  documentType="invoice"
  file="//upload the file"


  upload po pdf file
  POST: http://localhost:3000/api/documents/upload  
  documentType="po"
  file="//upload the file"


  upload grn pdf file
  POST: http://localhost:3000/api/documents/upload  
  documentType="grn"
  file="//upload the file"


  3. Get document api
    
  GET: http://localhost:3000/api/documents/documentId


  4. Match result api 
   
  GET: http://localhost:3000/api/match/CI4PO05788 // This is for the assignment part

  GET: http://localhost:3000/api/match/poNumber




# My Approach

This project is a Node.js and Express backend system that uses Gemini 2.5 Flash to extract structured data from procurement PDFs such as:

- Purchase Orders (PO)
- Goods Receipt Notes (GRN)
- Invoices

After extracting the data, the system performs a Three-Way Match using deterministic JavaScript logic.

---

Architectural Approach

The system separates document upload and document matching into different steps.

Instead of using simple OCR text extraction, Gemini AI converts PDF content directly into structured JSON data. This makes the extracted data cleaner and easier to process.

The system is also designed to handle uploads in any order.  
For example:

- Invoice can be uploaded first
- PO can be uploaded later
- GRN can be uploaded anytime

Once all required documents are available, the matching process runs automatically.


# Data Model

 Model for the document ->
 const DocumentSchema = new mongoose.Schema({
   poNumber: { type: String, required: true, index: true, trim: true },
   type: { type: String, required: true, enum: ['po', 'grn', 'invoice'] },
   data: { type: mongoose.Schema.Types.Mixed, required: true },
   uploadedAt: { type: Date, default: Date.now }
 });

# Parsing flow ->
 [PDF File Stream] ──> [Multer Memory Buffer] ──> [Base64 Conversion] ──> [Gemini 2.5 Flash + JSON Schema] ──> [Structured MongoDB Save]

# Matching Logic

The matching process is handled using normal JavaScript logic instead of AI to ensure consistent and reliable results.

1. Document Verification
Checks whether all required documents are available:
- PO
- GRN
- Invoice

If any document is missing, matching is not performed.

2. Duplicate Detection
Checks if multiple documents of the same type are uploaded for the same `poNumber`.

Example:
- Multiple POs for the same order
- Multiple invoices for the same order

Such cases are flagged as duplicates.

3. SKU Validation
Compares invoice item codes with PO item codes.

If an item exists in the invoice but not in the PO, it is flagged as:

```txt id="t6vjlwm"
item_missing_in_po


# Handling Out-of-Order Uploads

Supply chain documents often arrive in non-sequential order (e.g., invoices before warehouse tallies).
To support this, the ingestion pipeline is fully order-independent — documents can be uploaded in any sequence.

Documents are grouped using a shared poNumber.

If only 1 or 2 required documents are present, the API returns:
{
  "status": "insufficient_documents"
}
The reconciliation logic automatically triggers as soon as the final missing document is uploaded.
Key Assumptions
Every document must contain a valid, extractable poNumber.
itemCode values are expected to remain consistent across documents. Any mismatch is flagged as a discrepancy.

# Engineering Tradeoffs
In-Memory Buffering vs Disk Storage

Using multer.memoryStorage() improves upload throughput and avoids local disk I/O overhead, trading higher short-term RAM usage for faster processing speed.

Strict SKU Matching

Matching is performed using exact SKU/item code comparison. This ensures audit-level accuracy but treats formatting inconsistencies across systems as explicit mismatches rather than resolving them silently.

# Future Improvements
Semantic SKU Mapping

Introduce embedding-based similarity matching to automatically map mismatched vendor and internal SKU formats using item descriptions.

Cloud-Based File Streaming

Move large document streams to AWS S3 to reduce server RAM usage and support massive multi-page uploads efficiently.

Asynchronous Processing Workers

Shift reconciliation workloads to distributed workers (e.g., BullMQ or RabbitMQ) to maintain low API response latency during heavy processing



