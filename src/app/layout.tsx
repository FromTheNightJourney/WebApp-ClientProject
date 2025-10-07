import './globals.css';
import Header from '@/components/headers';
import Footer from '@/components/footers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-seven">
        <Header />

        <main className='flex-grow'>
            {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}