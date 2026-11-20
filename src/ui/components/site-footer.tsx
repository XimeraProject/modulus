import { Image, LangLink } from '@modulus-learning/host-tanstack-start/framework/index'
import type { Locale } from '@modulus-learning/host-tanstack-start/i18n/i18n-config'
import logoWhite from '@modulus-learning/host-tanstack-start/images/logo/modulus-logo-white.svg'

/**
 * This installation's site footer. The packaged `SiteFooter` (host-tanstack-start
 * 0.12.0) hardcodes its link columns, so this copy keeps its layout and chrome
 * and replaces the columns with two: About and Legal.
 */

interface FooterLink {
  label: string
  href: string
}

const SECTIONS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'About',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Docs', href: '/docs' },
      { label: 'About', href: '/about' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Use', href: '/terms-of-use' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
]

function Credits() {
  return (
    <p className="mt-0 text-[0.9em]">
      Made with ❤️ by{' '}
      <a
        className="text-white"
        href="https://infonomic.io"
        target="_blank"
        rel="noopener noreferrer"
      >
        Infonomic
      </a>
    </p>
  )
}

function RecaptchaNotice() {
  return (
    <span style={{ fontSize: '0.9em' }}>
      This site is protected by reCAPTCHA and the Google&nbsp;
      <a
        href="https://policies.google.com/privacy"
        className="ext text-white"
        target="_blank"
        rel="noopener nofollow noreferrer"
      >
        Privacy Policy
      </a>
      &nbsp;and&nbsp;
      <a
        href="https://policies.google.com/terms"
        className="ext text-white"
        target="_blank"
        rel="noopener nofollow noreferrer"
      >
        Terms of Service
      </a>
      &nbsp;apply.
    </span>
  )
}

export function SiteFooter({ lng, sticky = false }: { lng: Locale; sticky?: boolean }) {
  return (
    <div className={`bottom-0 left-0 z-10 w-full overflow-hidden${sticky ? ' sticky' : ''}`}>
      <footer className="w-full min-w-full bg-canvas-800 px-[18px] pt-8 pb-8 dark:bg-canvas-800">
        <div className="footer-content mx-auto max-w-[1200px] gap-0 text-white sm:grid lg:grid-cols-[1fr_1.2fr] lg:gap-8">
          <div className="footer-1">
            <div id="branding" className="branding -ml-1 mb-2">
              <LangLink prefetch={false} href="/" lng={lng} aria-label="Home">
                <div className="mr-2 w-[200px] transition-all duration-500 ease-out">
                  <Image src={logoWhite} width={200} alt="Modulus" />
                </div>
              </LangLink>
            </div>
            <div className="hidden sm:block">
              <Credits />
            </div>
            <div className="hidden sm:block" style={{ marginBottom: '0.5em' }}>
              <RecaptchaNotice />
            </div>
          </div>
          <nav className="footer-2 pt-6 lg:w-[70%] lg:justify-self-end" aria-label="Footer">
            <div className="grid grid-cols-2 gap-1 sm:gap-4 md:gap-6">
              {SECTIONS.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-4 font-semibold">{section.title}</h3>
                  <ul className="space-y-1 text-gray-400">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <LangLink
                          className="transition-colors hover:text-white"
                          href={link.href}
                          lng={lng}
                        >
                          {link.label}
                        </LangLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
          <div className="footer-3 pt-0 sm:hidden">
            <div className="mt-[1.5em] block">
              <Credits />
            </div>
            <div style={{ marginBottom: '0.5em' }}>
              <RecaptchaNotice />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
