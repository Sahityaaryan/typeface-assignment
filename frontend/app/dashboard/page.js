'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [historyFile, setHistoryFile] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');
  const [ocrMethod, setOcrMethod] = useState('standard'); // Default to standard OCR
  const router = useRouter();
  const categoryChartRef = useRef(null);
  const dateChartRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
    return () => {
      if (categoryChartRef.current) {
        categoryChartRef.current.destroy();
        categoryChartRef.current = null;
      }
      if (dateChartRef.current) {
        dateChartRef.current.destroy();
        dateChartRef.current = null;
      }
    };
  }, [page, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/transactions`, {
        params: { startDate, endDate, page, limit: 10 },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTransactions(res.data.transactions);
      setTotalPages(res.data.pages);
      updateCharts(res.data.transactions);
    } catch (error) {
      console.log("Error[fetching transactions]: ", error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/auth/login');
      } else {
        setModalMessage(error.response?.data?.error || 'Failed to fetch transactions');
        setModalType('error');
        document.getElementById('alert_modal').showModal();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/transactions`,
        { type, amount, category, date, description },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setModalMessage('Transaction added successfully');
      setModalType('success');
      document.getElementById('alert_modal').showModal();
      setType('expense');
      setAmount('');
      setCategory('');
      setDate('');
      setDescription('');
      fetchTransactions();
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/auth/login');
      } else {
        setModalMessage(error.response?.data?.error || 'Failed to add transaction');
        setModalType('error');
        document.getElementById('alert_modal').showModal();
      }
    }
  };

  const handleReceiptUpload = async (e) => {
    e.preventDefault();
    if (!receiptFile) {
      setModalMessage('Please select a receipt file');
      setModalType('error');
      document.getElementById('alert_modal').showModal();
      return;
    }
    const formData = new FormData();
    formData.append('file', receiptFile);
    try {
      if (ocrMethod === 'standard') {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/transactions/receipt`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        setModalMessage(res.data.message);
        setModalType('success');
        document.getElementById('alert_modal').showModal();
        setReceiptFile(null);
        fetchTransactions();
      } else {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/transactions/receipt-ai`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        setModalMessage(res.data.message);
        setModalType('success');
        document.getElementById('alert_modal').showModal();
        setReceiptFile(null);
        fetchTransactions();
      }
    } catch (error) {
      console.log("Error[receipt upload]: ", error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/auth/login');
      } else {
        setModalMessage(error.response?.data?.error || 'Failed to upload receipt');
        setModalType('error');
        document.getElementById('alert_modal').showModal();
      }
    }
  };

  const handleHistoryUpload = async (e) => {
    e.preventDefault();
    if (!historyFile) {
      setModalMessage('Please select a transaction history file');
      setModalType('error');
      document.getElementById('alert_modal').showModal();
      return;
    }
    const formData = new FormData();
    formData.append('file', historyFile);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/transactions/history`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setModalMessage(res.data.message);
      setModalType('success');
      document.getElementById('alert_modal').showModal();
      setHistoryFile(null);
      fetchTransactions();
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/auth/login');
      } else {
        setModalMessage(error.response?.data?.error || 'Failed to import transaction history');
        setModalType('error');
        document.getElementById('alert_modal').showModal();
      }
    }
  };

  const updateCharts = (data) => {
    if (categoryChartRef.current) {
      categoryChartRef.current.destroy();
      categoryChartRef.current = null;
    }
    if (dateChartRef.current) {
      dateChartRef.current.destroy();
      dateChartRef.current = null;
    }
    const categoryData = data.reduce((acc, t) => {
      if (t.type === 'expense') acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    categoryChartRef.current = new ChartJS(ctx1, {
      type: 'bar',
      data: {
        labels: Object.keys(categoryData),
        datasets: [
          {
            label: 'Expenses by Category',
            data: Object.values(categoryData),
            backgroundColor: '#36A2EB',
            borderColor: '#1E88E5',
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: { y: { beginAtZero: true } },
      },
    });
    const dateData = data.reduce((acc, t) => {
      if (t.type === 'expense') {
        const date = new Date(t.date).toLocaleDateString();
        acc[date] = (acc[date] || 0) + t.amount;
      }
      return acc;
    }, {});
    const ctx2 = document.getElementById('dateChart').getContext('2d');
    dateChartRef.current = new ChartJS(ctx2, {
      type: 'bar',
      data: {
        labels: Object.keys(dateData),
        datasets: [
          {
            label: 'Expenses by Date',
            data: Object.values(dateData),
            backgroundColor: '#FF6384',
            borderColor: '#E91E63',
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: { y: { beginAtZero: true } },
      },
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <dialog id="alert_modal" className="modal">
        <div className="modal-box">
          <h3 className={`font-bold text-lg ${modalType === 'error' ? 'text-error' : 'text-success'}`}>
            {modalType === 'error' ? 'Error' : 'Success'}
          </h3>
          <p className="py-4">{modalMessage}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-primary">Close</button>
            </form>
          </div>
        </div>
      </dialog>
      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="select select-bordered" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input type="number" placeholder="Amount" className="input input-bordered" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input type="text" placeholder="Category" className="input input-bordered" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input type="date" className="input input-bordered" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="text" placeholder="Description" className="input input-bordered" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" className="btn btn-primary">Add Transaction</button>
        </div>
      </form>
      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="date" className="input input-bordered" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="input input-bordered" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <h2 className="card-title mb-2">Upload Receipt (Image/PDF)</h2>
        <form onSubmit={handleReceiptUpload}>
          <input type="file" accept="image/*,.pdf" className="file-input file-input-bordered w-full max-w-xs" onChange={(e) => setReceiptFile(e.target.files[0])} />
          <div className="mt-2">
            <label className="label">
              <input type="radio" value="standard" checked={ocrMethod === 'standard'} onChange={(e) => setOcrMethod(e.target.value)} className="radio" />
              <span className="ml-2">Standard OCR (60-70% accuracy) - Supports images and PDFs</span>
            </label>
            <label className="label">
              <input type="radio" value="ai-enhanced" checked={ocrMethod === 'ai-enhanced'} onChange={(e) => setOcrMethod(e.target.value)} className="radio" />
              <span className="ml-2">AI-Enhanced OCR (97-98% accuracy) - Supports images and PDFs</span>
            </label>
          </div>
          <button type="submit" className="btn btn-primary mt-2">Submit Receipt</button>
        </form>
      </div>
      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <h2 className="card-title mb-2">Upload Transaction History (PDF)</h2>
        <form onSubmit={handleHistoryUpload}>
          <input type="file" accept=".pdf" className="file-input file-input-bordered w-full max-w-xs" onChange={(e) => setHistoryFile(e.target.files[0])} />
          <button type="submit" className="btn btn-primary mt-2">Submit History</button>
        </form>
      </div>
      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Transactions</h2>
          <button onClick={fetchTransactions} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5m11 11v-5h-5" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr><th>Type</th><th>Amount</th><th>Category</th><th>Date</th><th>Description</th></tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id}>
                  <td>{t.type}</td>
                  <td>₹{t.amount.toFixed(2)}</td>
                  <td>{t.category}</td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td>{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="btn-group mt-4">
          <button className="btn" disabled={page === 1} onClick={() => setPage(page - 1)}>«</button>
          <button className="btn">Page {page}</button>
          <button className="btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>»</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="card-title">Expenses by Category</h2>
          <canvas id="categoryChart"></canvas>
        </div>
        <div className="card bg-base-100 shadow-xl p-4">
          <h2 className="card-title">Expenses by Date</h2>
          <canvas id="dateChart"></canvas>
        </div>
      </div>
    </div>
  );
}