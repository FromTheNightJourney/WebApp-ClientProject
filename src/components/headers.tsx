"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Tabs", href: "/tabs" },
    { name: "Pre-lab Questions", href: "/prelab" },
    { name: "Escape Room", href: "/escape-room" },
    { name: "Coding Races", href: "/coding-races" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white text-zinc-800 p-4 border-b-3 border-zinc-900">
      <div className="relative flex justify-end items-center">
        <div className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">LaTrobe University Learning Management Website</div>
        <div className="text-lg font-semibold">22586532</div>
      </div>

      <hr className="my-3 border-zinc-800" />

      <div className="flex justify-between items-center">
        <nav className="flex space-x-4">
          {navLinks.map((link, index) => (
            <div key={link.name} className="flex items-center">
              <Link
                href={link.href}
                className={`
                  py-1 border-b-2 transition-colors duration-300
                  ${pathname === link.href
                    ? "text-zinc-900 border-zinc-900 font-semibold"
                    : "text-zinc-500 border-transparent hover:text-zinc-900 hover:border-zinc-400"
                  }
                `}
              >
                {link.name}
              </Link>
              {index < navLinks.length - 1 && <span className="text-zinc-800 ml-4">|</span>}
            </div>
          ))}
        </nav>
        <div className="flex items-center space-x-4">
          {/* Updated this Link component */}
          <Link
            href="/about"
            className={`
              py-1 border-b-2 transition-colors duration-300
              ${pathname === '/about'
                ? "text-zinc-900 border-zinc-900 font-semibold"
                : "text-zinc-500 border-transparent hover:text-zinc-900 hover:border-zinc-400"
              }
            `}
          >
            About
          </Link>
          <div className="cursor-pointer">
            <div className="space-y-1">
              <div className="w-6 h-1 bg-zinc-800"></div>
              <div className="w-6 h-1 bg-zinc-800"></div>
              <div className="w-6 h-1 bg-zinc-800"></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}