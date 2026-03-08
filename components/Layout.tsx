import { ReactNode } from "react";
import Header from "./Header";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <Header />
      <main className="flex-auto py-4 pb-0 sm:pb-0 mb-[60px] max-w-[1600px] w-full">
        {children}
      </main>
      <Navbar />
    </div>
  );
}
