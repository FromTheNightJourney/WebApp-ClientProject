"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const navLinks = [
    { name: "Tabs", href: "/tabs" },
    { name: "Pre-lab Questions", href: "/prelab" },
    { name: "Escape Room", href: "/escape-room" },
    { name: "Coding Races", href: "/coding-races" },
  ];

  // Dark mode functionality
  useEffect(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (prefersDark) {
      document.body.classList.add('dark-mode');
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.className = 'dark'
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.className = 'light'
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-five  text-two  p-4 border-b-3 border-one ">
      <div className="relative flex justify-end items-center">
        <div className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">LaTrobe University Learning Management Website</div>
        <div className="text-lg font-semibold">22586532</div>
      </div>

      <hr className="my-3 border-two " />

      <div className="flex justify-between items-center">
        <nav className="flex space-x-4">
          {navLinks.map((link, index) => (
            <div key={link.name} className="flex items-center">
              <Link
                href={link.href}
                className={`
                  py-1 border-b-2 transition-colors duration-300
                  ${pathname === link.href
                    ? "text-one  border-one dark:border-white font-semibold"
                    : "text-two  border-transparent hover:text-one  hover:border-six "
                  }
                `}
              >
                {link.name}
              </Link>
              {index < navLinks.length - 1 && <span className="text-two  ml-4">|</span>}
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
                ? "text-one  border-one dark:border-white font-semibold"
                : "text-two  border-transparent hover:text-one  hover:border-six "
              }
            `}
          >
            About
          </Link>
          
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="dark-mode-toggle"
            aria-label="Toggle dark mode"
          >
            <svg className="toggle-icon sun" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <svg className="toggle-icon moon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <span className="ml-1">{isDarkMode ? 'Dark' : 'Light'}</span>
          </button>
          
          <div className="cursor-pointer">
            <div className="space-y-1">
              <div className="w-6 h-1 bg-two "></div>
              <div className="w-6 h-1 bg-two "></div>
              <div className="w-6 h-1 bg-two "></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}