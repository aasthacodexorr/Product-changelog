'use client';

import Link from 'next/link';
import Image from 'next/image';
import zopLogo from '@/assests/zlogo.png';

interface HeaderButton {
  label: string;
  href: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

interface HeaderProps {
  buttons?: HeaderButton[];
}

export function Header({ buttons = [] }: HeaderProps) {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image 
                src={zopLogo} 
                alt="Zop Logo" 
                className="h-8 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Right Side Buttons */}
          {buttons.length > 0 && (
            <div className="flex items-center gap-3">
              {buttons.map((button, index) => (
                button.onClick ? (
                  <button
                    key={index}
                    onClick={button.onClick}
                    disabled={button.loading}
                    className={`
                      group relative flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium 
                      transition-all duration-200
                      ${button.variant === 'danger' 
                        ? 'border border-red-500 text-red-500 hover:bg-red-500 hover:text-white' 
                        : 'border border-[#2e8cff] text-[#2e8cff] hover:bg-[#2e8cff] hover:text-white'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <span>{button.loading ? `${button.label}...` : button.label}</span>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                      button.variant === 'danger' 
                        ? 'bg-red-50 group-hover:bg-white/20' 
                        : 'bg-blue-50 group-hover:bg-white/20'
                    }`}>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 512 512"
                        className={`transition-colors ${
                          button.variant === 'danger' 
                            ? 'text-red-500 group-hover:text-white' 
                            : 'text-[#2e8cff] group-hover:text-white'
                        }`}
                      >
                        <path
                          d="M224 144 H160 A80 80 0 0 0 80 224 V368 A80 80 0 0 0 160 448 H288 A80 80 0 0 0 368 368 V288"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="32"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M272 80 H432 V240 M432 80 L192 320"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="32"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                ) : (
                  <Link
                    key={index}
                    href={button.href}
                    className="group relative flex items-center gap-2 rounded-lg border border-[#2e8cff] px-5 py-2.5 text-sm font-medium text-[#2e8cff] transition-all duration-200 hover:bg-[#2e8cff] hover:text-white"
                  >
                    <span>{button.label}</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 transition-colors group-hover:bg-white/20">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 512 512"
                        className="text-[#2e8cff] transition-colors group-hover:text-white"
                      >
                        <path
                          d="M224 144 H160 A80 80 0 0 0 80 224 V368 A80 80 0 0 0 160 448 H288 A80 80 0 0 0 368 368 V288"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="32"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M272 80 H432 V240 M432 80 L192 320"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="32"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
