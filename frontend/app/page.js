'use client';
import Navbar from './components/Navbar';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      <div className="container mx-auto p-6 text-center pt-24">
        <h1 className="text-4xl font-bold mb-4">Welcome to Personal Finance Assistant</h1>
        <p className="text-lg mb-6">Track your expenses, manage finances, and stay in control.</p>
        {isAuthenticated ? (
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => router.push('/auth/login')}>
            Get Started
          </button>
        )}
      </div>
    </div>
  );
}