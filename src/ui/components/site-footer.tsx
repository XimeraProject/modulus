import { Image, LangLink } from '@modulus-learning/host-tanstack-start/framework/index'
import type { Locale } from '@modulus-learning/host-tanstack-start/i18n/i18n-config'
import logoWhite from '@modulus-learning/host-tanstack-start/images/logo/modulus-logo-white.svg'

import osuWhite from '@/ui/images/osu-white.svg'

/**
 * This installation's site footer. The packaged `SiteFooter` (host-tanstack-start
 * 0.12.0) hardcodes its link columns and branding, so this copy keeps its chrome
 * and lays out the OSU and Modulus logos, the Ximera team's contact details, and
 * two link columns: About and Legal.
 */

interface FooterLink {
  label: string
  href: string
  /** An absolute URL on another site, opened in a new tab. */
  external?: boolean
}

const SECTIONS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'About',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Docs', href: 'https://modulus-learning.org/docs', external: true },
      { label: 'About', href: '/about' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Use', href: '/terms-of-use' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
]

const navLinkClass = 'transition-colors hover:text-white hover:underline'

const XIMERA_EMAIL = 'ximera@math.osu.edu'

const linkClass = 'text-white underline-offset-2 hover:underline'

function Logos({ lng }: { lng: Locale }) {
  return (
    <div className="flex items-center gap-5 sm:gap-6">
      <a
        href="https://www.osu.edu/"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
        aria-label="The Ohio State University"
      >
        <img src={osuWhite} width={94} height={64} alt="" className="block h-16 w-auto" />
      </a>
      <span className="h-14 w-px shrink-0 bg-white/40" aria-hidden="true" />
      <LangLink prefetch={false} href="/" lng={lng} aria-label="Modulus home">
        <Image src={logoWhite} width={170} alt="Modulus" />
      </LangLink>
    </div>
  )
}

function Contact() {
  return (
    <address className="mt-6 space-y-1 text-[0.95em] not-italic text-white/85">
      <p className="font-semibold text-white">Ximera team</p>
      <p>100 Math Tower, 231 West 18th Avenue, Columbus OH, 43210-1174</p>
      <p>
        Phone:{' '}
        <a className={linkClass} href="tel:+17738095659">
          (773) 809-5659
        </a>
        <span className="mx-2 text-white/50" aria-hidden="true">
          |
        </span>
        <a className={linkClass} href={`mailto:${XIMERA_EMAIL}`}>
          Contact
        </a>
      </p>
    </address>
  )
}

function FooterNav({ lng }: { lng: Locale }) {
  return (
    <nav aria-label="Footer">
      <div className="grid grid-cols-2 gap-6 md:gap-10">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="mb-4 font-semibold">{section.title}</h3>
            <ul className="space-y-1 text-white/80">
              {section.links.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      className={navLinkClass}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <LangLink className={navLinkClass} href={link.href} lng={lng}>
                      {link.label}
                    </LangLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

function RecaptchaNotice() {
  return (
    <p>
      This site is protected by reCAPTCHA and the Google{' '}
      <a
        href="https://policies.google.com/privacy"
        className={`ext ${linkClass}`}
        target="_blank"
        rel="noopener nofollow noreferrer"
      >
        Privacy Policy
      </a>{' '}
      and{' '}
      <a
        href="https://policies.google.com/terms"
        className={`ext ${linkClass}`}
        target="_blank"
        rel="noopener nofollow noreferrer"
      >
        Terms of Service
      </a>{' '}
      apply.
    </p>
  )
}

export function SiteFooter({ lng, sticky = false }: { lng: Locale; sticky?: boolean }) {
  return (
    <div className={`bottom-0 left-0 z-10 w-full overflow-hidden${sticky ? ' sticky' : ''}`}>
      <footer className="w-full min-w-full bg-scarlet-500 px-[18px] pt-10 md:px-8 xl:px-12 pb-8 dark:bg-scarlet-600">
        <div className="mx-auto max-w-[1200px] text-white">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <div>
              <Logos lng={lng} />
              <Contact />
            </div>
            <div className="lg:justify-self-end lg:pt-2">
              <FooterNav lng={lng} />
            </div>
          </div>

          <div className="mt-10 border-t border-white/25 pt-6 text-[0.85em] text-white/80">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-white">
                © 2013–{new Date().getFullYear()}, The Ohio State University — Ximera team
              </p>
              <p>
                Made with ❤️ by{' '}
                <a
                  className={linkClass}
                  href="https://infonomic.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Infonomic
                </a>
              </p>
            </div>
            <div className="mt-3 space-y-1 lg:max-w-[70%]">
              <p>
                If you have trouble accessing this page and need to request an alternate format,
                contact{' '}
                <a className={linkClass} href={`mailto:${XIMERA_EMAIL}`}>
                  {XIMERA_EMAIL}
                </a>
                .
              </p>
              <RecaptchaNotice />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
