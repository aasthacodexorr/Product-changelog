'use client';

import Link from 'next/link';
import Image from 'next/image';
import zopLogo from '@/assests/zop.png';

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
        <div className="relative flex h-20 items-center justify-between">
          {/* Centered Logo */}
          <div className="absolute left-12 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/" className="flex items-center">
              <Image
                src={zopLogo}
                alt="Zop Logo"
                width={200}
                height={80}
                className="h-14 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          {/* Right Side Buttons */}
          {buttons.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              {buttons.map((button, index) =>
                button.onClick ? (
                  <button
                    key={index}
                    onClick={button.onClick}
                    disabled={button.loading}
                    className={`group relative flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                      button.variant === 'danger'
                        ? 'border border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
                        : 'border border-[#2e8cff] text-[#2e8cff] hover:bg-[#2e8cff] hover:text-white'
                    }`}
                  >
                    <span>
                      {button.loading ? `${button.label}...` : button.label}
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
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
