import './globals.css';
import Navbar from './components/Navbar';

export const metadata = {
  title: 'Personal Finance Assistant',
  description: 'Track and manage your finances',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-base-200 pt-16"> {/* Added pt-16 to avoid overlap with navbar */}
        <Navbar />
        {children}
      </body>
    </html>
  );
}