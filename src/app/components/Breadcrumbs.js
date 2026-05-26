'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Componente Breadcrumbs - Navegação em migalhas de pão
 *
 * @param {Array} items - Array de objetos com {label, href?}
 * @example
 * <Breadcrumbs items={[
 *   { label: 'Dashboard', href: '/dashboard' },
 *   { label: 'Atas', href: '/atas' },
 *   { label: 'Ata 33/2025' }
 * ]} />
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center text-sm text-gray-600 mb-4 flex-wrap gap-2" aria-label="Breadcrumb">
      {/* Home icon como primeiro item */}
      <Link
        href="/dashboard"
        className="hover:text-blue-600 transition-colors flex items-center"
        title="Dashboard"
      >
        <Home size={16} />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight size={16} className="text-gray-400" />

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-gray-900' : ''}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
