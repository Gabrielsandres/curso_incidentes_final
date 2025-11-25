"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
};

type StickyNavbarProps = {
  items: readonly NavItem[];
  ctaLabel: string;
  ctaHref: string;
};

export function StickyNavbar({ items, ctaHref, ctaLabel }: StickyNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleResize = () => setMenuOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  const navClasses = [
    "fixed inset-x-0 top-0 z-50 border-b transition-all duration-200",
    scrolled
      ? "border-white/10 bg-[#0f172a]/90 backdrop-blur-[16px]"
      : "border-transparent bg-transparent backdrop-blur-0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={navClasses}>
      {/* 🔹 TIREI o max-w-6xl e deixei o container em largura total */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        {/* DIV 1 - LOGO (ESQUERDA) */}
        <div className="p-0 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <a href="#hero" className="flex items-center" aria-label="Voltar ao início">
            <Image
              src="/Logo-removebg-preview.png"
              alt="Curso Gestão de Incidentes em Estabelecimentos de Ensino"
              width={320}
              height={60}
              className="h-18 w-auto object-contain drop-shadow-[0_0_16px_rgba(37,99,235,0.7)]"
              priority
            />
          </a>
        </div>

        {/* DIV 2 - ITENS DA NAV (CENTRO) */}
        <nav className="hidden lg:flex flex-1 justify-center">
          <div className="flex items-center gap-6 text-sm text-white/80">
            {items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-1 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* DIV 3 - BOTÕES (DIREITA) */}
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Entrar
          </Link>
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[#1669d8] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(22,105,216,0.4)] transition hover:bg-[#1b73eb]"
          >
            {ctaLabel}
          </a>
        </div>

        {/* MOBILE BUTTON (APARECE SÓ NO MOBILE) */}
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white lg:hidden"
          aria-label="Abrir menu de navegação"
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* MENU MOBILE */}
      {menuOpen ? (
        <div className="border-t border-white/10 bg-[#050b1f] px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-3 text-sm text-white/70">
            {items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 hover:bg-white/5 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-4 py-2 text-center text-sm font-semibold text-white transition hover:border-white hover:bg:white/10"
            >
              Entrar
            </Link>
            <a
              href={ctaHref}
              className="rounded-full bg-[#1669d8] px-4 py-2 text-center text-sm font-semibold text:white shadow-[0_12px_30px_rgba(22,105,216,0.35)] transition hover:bg-[#1b73eb]"
              onClick={() => setMenuOpen(false)}
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
