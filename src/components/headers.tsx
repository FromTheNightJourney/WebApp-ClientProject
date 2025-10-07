"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Cookies from 'js-cookie';

export default function Header() {
  const pathname = usePathname();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const menuRef = useRef<HTMLDivElement>(null); 

  const navLinks = [
    { name: "tabs", href: "/tabs" },
    { name: "pre-lab questions", href: "/prelab" },
    { name: "escape room", href: "/escape-room" },
    { name: "coding races", href: "/coding-races" },
  ];
  
  const allNavLinks = [
    ...navLinks,
    { name: "about", href: "/about" },
  ];

  // effect: save last page to cookie
  useEffect(() => {
    const isMainNavLink = navLinks.some(link => link.href === pathname);
    if (isMainNavLink) {
      Cookies.set('lastvisitedpage', pathname, { expires: 365 });
    }
  }, [pathname, navLinks]); // runs when path changes

  // effect: check localstorage/system for theme on load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (prefersDark) {
      document.documentElement.className = 'dark';
      setIsDarkMode(true);
    } else {
      document.documentElement.className = 'light';
    }
  }, []);

  // func: handles theme toggle click
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

  // effect: click outside menu closes it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // i head the render head renderer
  return (
    <header className="sticky top-0 z-50 bg-five text-two p-4 border-b-3 border-one">
      {/* top part: title & id */}
      <div className="relative flex justify-end items-center">
        <div className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">latrobe university learning management website</div>
        <div className="text-lg font-semibold">22586526</div>
      </div>

      <hr className="my-3 border-two" />

      {/* bottom part: navigation */}
      <div className="flex justify-between items-center">
        {/* left side nav */}
        <nav className="flex space-x-4">
          {navLinks.map((link, index) => (
            <div key={link.name} className="flex items-center">
              <Link
                href={link.href}
                // active link style logic
                className={`
                  py-1 border-b-2 transition-colors duration-300
                  ${pathname === link.href
                    ? "text-one border-one dark:border-white font-semibold"
                    : "text-two border-transparent hover:text-one hover:border-six"
                  }
                `}
              >
                {link.name}
              </Link>
              {/* separator */}
              {index < navLinks.length - 1 && <span className="text-two ml-4">|</span>}
            </div>
          ))}
        </nav>

        {/* right side controls */}
        <div className="flex items-center space-x-4">
          {/* about link */}
          <Link
            href="/about"
            className={`
              py-1 border-b-2 transition-colors duration-300
              ${pathname === '/about'
                ? "text-one border-one dark:border-white font-semibold"
                : "text-two border-transparent hover:text-one hover:border-six"
              }
            `}
          >
            about
          </Link>
          
          {/* theme toggle button */}
          <button
            onClick={toggleDarkMode}
            className="dark-mode-toggle"
            aria-label="toggle dark mode"
          >
            <svg className="toggle-icon sun" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <svg className="toggle-icon moon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <span className="ml-1">{isDarkMode ? 'dark' : 'light'}</span>
          </button>
          
          {/* hamburger menu */}
          <div className="relative" ref={menuRef}>
            {/* hamburger icon, animates */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative top-0.5 z-20 w-6 h-6 text-two focus:outline-none"
              aria-label="toggle menu"
            >
              <span className={`block absolute h-1 w-full bg-current rounded-md transform transition duration-300 ease-in-out ${isMenuOpen ? 'rotate-45 top-2.5' : 'top-1'}`}></span>
              <span className={`block absolute h-1 w-full bg-current rounded-md transform transition duration-300 ease-in-out ${isMenuOpen ? 'opacity-0' : 'top-2.5'}`}></span>
              <span className={`block absolute h-1 w-full bg-current rounded-md transform transition duration-300 ease-in-out ${isMenuOpen ? '-rotate-45 top-2.5' : 'top-4'}`}></span>
            </button>

            {/* dropdown, animates open/close */}
            <div
              className={`
                absolute right-0 mt-3 w-48 bg-five border-2 border-one rounded-lg shadow-xl
                transition-all duration-300 ease-in-out origin-top-right
                ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
              `}
            >
              <div className="py-2">
                {/* map all links into the dropdown */}
                {allNavLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)} 
                    className={`block px-4 py-2 text-md transition-colors
                      ${pathname === link.href
                        ? 'font-semibold text-one'
                        : 'text-two hover:bg-six hover:text-one'
                      }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}