'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, { email, password });
      login(res.data.token);
      router.push('/');
    } catch (err) {
      setError('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Register</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-control">
              <label className="label">Email</label>
              <input type="email" className="input input-bordered" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label">Password</label>
              <input type="password" className="input input-bordered" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="card-actions justify-end">
              <button className={`btn btn-primary ${isLoading ? 'loading animate-spin' : ''}`} onClick={handleRegister}>
                {isLoading ? '' : 'Register'}
              </button>
            </div>
            <p className="mt-2">Already have an account? <a href="/auth/login" className="link link-primary">Login</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}