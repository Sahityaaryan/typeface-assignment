'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, { email, password });
      localStorage.setItem('token', res.data.token);
      router.push('/dashboard');
    } catch (err) {
      setError('Registration failed');
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
              <input type="email" className="input input-bordered" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label">Password</label>
              <input type="password" className="input input-bordered" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="card-actions justify-end">
              <button className="btn btn-primary" onClick={handleRegister}>Register</button>
            </div>
            <p className="mt-2">Already have an account? <a href="/auth/login" className="link link-primary">Login</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}