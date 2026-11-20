import { createModulusRootRoute } from '@modulus-learning/host-tanstack-start/routes/__root.route'

// The installation owns the stylesheet entry (spec D2): kit and Modulus CSS, OSU's sheets, then
// one Tailwind entry, so OSU's theme values compile with the package's.
import '@/ui/styles/global.css'

// This installation's document choices; the document itself is Modulus's.
export const Route = createModulusRootRoute({
  appTitle: 'Modulus',
  analytics: {
    domain: 'modulus-learning.org',
    src: '/modules/js/script.js',
    api: '/modules/api/event',
  },
})
