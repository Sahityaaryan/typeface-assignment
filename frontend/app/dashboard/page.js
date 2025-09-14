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
  const [ocrMethod, setOcrMethod] = useState('standard');
  const [isLoading, setIsLoading] = useState(false);
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
      console.log("urLL: ", process.env.NEXT_PUBLIC_API_URL);
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  const resetDateRange = () => {
    setStartDate('');
    setEndDate('');
    fetchTransactions();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <dialog id="alert_modal" className="modal">
        <div className="modal-box">
          <h3 className={`font-bold text-lg ${modalType === 'error' ? 'text-error' : 'text-success'}`}>
            {modalType === 'error' ? 'Error' : 'Success'}
          </h3>
          <p className="py-4">{modalMessage}</p>
          <div className="modal-action">
            <form method="dialog">
              <button className={`btn btn-primary ${isLoading ? 'loading' : ''}`}>Close</button>
            </form>
          </div>
        </div>
      </dialog>
      <div className="card bg-base-100 shadow-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount (₹)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Category</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Food, Fuel"
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Grocery shopping"
              />
            </div>
            <div className="form-control md:col-span-2">
              <button className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`} type="submit">
                {isLoading ? 'Loading...' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="date"
            className="input input-bordered w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="input input-bordered w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            className={`btn btn-secondary w-full ${isLoading ? 'loading' : ''}`}
            onClick={resetDateRange}
          >
            {isLoading ? 'Loading...' : 'Reset'}
          </button>
        </div>
      </div>
      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <h2 className="card-title mb-2">Upload Receipt (Image/PDF)</h2>
        <form onSubmit={handleReceiptUpload} className="space-y-4">
          <input
            type="file"
            accept="image/*,.pdf"
            className="file-input file-input-bordered w-full max-w-xs"
            onChange={(e) => setReceiptFile(e.target.files[0])}
          />
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <div className="form-control flex-1 max-w-full">
              <label className="label cursor-pointer flex items-center gap-2 break-words">
                <input
                  type="radio"
                  value="standard"
                  checked={ocrMethod === 'standard'}
                  onChange={(e) => setOcrMethod(e.target.value)}
                  className="radio radio-primary"
                />
                <span className="label-text break-words text-wrap max-w-[200px] sm:max-w-none">Standard OCR (60-70% accuracy) - Supports images and PDFs</span>
              </label>
            </div>
            <div className="form-control flex-1 max-w-full">
              <label className="label cursor-pointer flex items-center gap-2 break-words">
                <input
                  type="radio"
                  value="ai-enhanced"
                  checked={ocrMethod === 'ai-enhanced'}
                  onChange={(e) => setOcrMethod(e.target.value)}
                  className="radio radio-secondary"
                />
                <span className="label-text break-words text-wrap max-w-[200px] sm:max-w-none">AI-Enhanced OCR (97-98% accuracy) - Supports images and PDFs</span>
              </label>
            </div>
          </div>
          <button className={`btn btn-primary w-full sm:w-auto ${isLoading ? 'loading' : ''}`} type="submit">
            {isLoading ? 'Loading...' : 'Submit Receipt'}
          </button>
        </form>
      </div>

      {/* upload transaction history */}
      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <h2 className="card-title mb-2">Upload Transaction History (PDF)</h2>
        <form onSubmit={handleHistoryUpload} className="space-y-4">
          <input
            type="file"
            accept=".pdf"
            className="file-input file-input-bordered w-full max-w-xs"
            onChange={(e) => setHistoryFile(e.target.files[0])}
          />
          <button className={`btn btn-primary w-full mb-3 ml-3 sm:w-auto ${isLoading ? 'loading' : ''}`} type="submit">
            {isLoading ? 'Loading...' : 'Submit History'}
          </button>
        </form>
      </div>


      <div className="card bg-base-100 shadow-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Transactions</h2>
          <button className={`btn btn-secondary ${isLoading ? 'loading' : ''}`} onClick={fetchTransactions}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Description</th>
              </tr>
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