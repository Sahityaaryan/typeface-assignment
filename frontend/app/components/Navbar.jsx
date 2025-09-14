
  'use client';
  import { useState, useEffect } from 'react';
  import { useRouter, usePathname } from 'next/navigation';
  import Link from 'next/link';

  export default function Navbar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      // Check for JWT token in localStorage
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    }, []);

    const handleLogout = () => {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      router.push('/auth/login');
    };

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full ">
        <div className="navbar bg-base-100 shadow-xl rounded-box animate-slide-in backdrop-filter backdrop-blur-lg">
          <div className="flex-1 ">
            <Link href="/" className="btn btn-ghost normal-case text-xl">
              Finance Assistant
            </Link>
          </div>
          <div className="flex-none">
            <ul className="menu menu-horizontal px-1">
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
          </div>
        </div>
      </div>
    );
  }