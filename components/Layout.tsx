import { ReactNode } from 'react';
import Header from './Header';
import Navbar from './Navbar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-auto p-4 sm:p-6">{children}</main>
      <Navbar />
    </div>
  );
}