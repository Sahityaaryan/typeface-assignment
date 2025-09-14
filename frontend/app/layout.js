import './globals.css';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';

export const metadata = {
  title: 'Personal Finance Assistant',
  description: 'Track and manage your finances',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-base-200 pt-16">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}