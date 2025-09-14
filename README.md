# Personal Finance Assistant

A full-stack application to track and manage personal finances, built with Next.js, Tailwind CSS, DaisyUI, Node.js, Express, and MongoDB.

## Deployed Site
- Live URL: [https://personalfinanceassist.netlify.app](https://personalfinanceassist.netlify.app)
- Test Files: [https://drive.google.com/drive/folders/1OLeCpr9Xbypgt7bq_lQ1pUPoHPCBQdEs?usp=sharing](https://drive.google.com/drive/folders/1OLeCpr9Xbypgt7bq_lQ1pUPoHPCBQdEs?usp=sharing)

## Features
- Create, view, and manage income/expense entries.
- List transactions within a specified date range with pagination.
- Visualize expenses by category and date using graphs.
- Extract expenses from uploaded receipts (images/PDFs).
- Support for multiple users with authentication.
- Import transaction history from tabular PDFs.

## Tech Stack
- **Frontend**: Next.js, Tailwind CSS, DaisyUI, Chart.js, Axios
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT
- **File Processing**: OCR-SPACE-API (OCR for images), pdf-parse (PDF parsing)
- **Other**: Multer (file uploads)

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud, e.g., MongoDB Atlas)
- OCR-SPACE-API dependencies (for OCR)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd PersonalFinanceAssistant