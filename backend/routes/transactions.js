const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { addTransaction, getTransactions, uploadReceipt, addBulkTransactions, uploadTransactionHistory, uploadReceiptAI } = require('../controllers/transactionController');
router.post('/', auth, addTransaction);
router.get('/', auth, getTransactions);
router.post('/receipt', auth, uploadReceipt);
router.post('/history', auth, uploadTransactionHistory);
router.post('/bulk', auth, addBulkTransactions);
router.post('/receipt-ai', auth, uploadReceiptAI); // New endpoint
module.exports = router;