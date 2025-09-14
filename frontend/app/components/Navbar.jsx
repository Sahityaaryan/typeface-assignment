'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-box">
      <div className="navbar">
        <div className="navbar-center flex justify-between items-center w-full">
          <Link href="/" className="btn btn-ghost normal-case text-xl">
            Finance Assistant
          </Link>
          <ul className="menu menu-horizontal px-1 flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    className={`hover:scale-105 transition-transform duration-200 ${
                      pathname === '/dashboard' ? 'text-primary font-semibold' : ''
                    }`}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="btn btn-ghost hover:scale-105 transition-transform duration-200"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/auth/login"
                    className={`hover:scale-105 transition-transform duration-200 ${
                      pathname === '/auth/login' ? 'text-primary font-bold' : ''
                    }`}
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/register"
                    className={`hover:scale-105 transition-transform duration-200 ${
                      pathname === '/auth/register' ? 'text-primary font-bold' : ''
                    }`}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
          {/* Mobile Menu Dropdown */}
          <div className="dropdown dropdown-end md:hidden">
            <label tabIndex={0} className="btn btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 p-2 shadow bg-white/10 backdrop-blur-md rounded-box w-52 border border-white/20">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link href="/dashboard" className={`hover:scale-105 transition-transform duration-200 ${pathname === '/dashboard' ? 'text-primary font-semibold' : ''}`}>
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout} className="btn btn-ghost hover:scale-105 transition-transform duration-200">
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/auth/login" className={`hover:scale-105 transition-transform duration-200 ${pathname === '/auth/login' ? 'text-primary font-bold' : ''}`}>
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/register" className={`hover:scale-105 transition-transform duration-200 ${pathname === '/auth/register' ? 'text-primary font-bold' : ''}`}>
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}