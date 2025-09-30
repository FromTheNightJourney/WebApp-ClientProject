export default function Footer() {
  const studentNumber = '22586526';
  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <footer className="w-full text-center p-4 border-t-3 text-zinc-800 bg-zinc-200  border-zinc-900">
      <p className="space-x-1">
        Latrobe Copyright, 2025 - {studentNumber} - {currentDate}
      </p>
    </footer>
  );
}