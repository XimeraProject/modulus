import { createFileRoute } from '@tanstack/react-router'

import { Hero } from '@/ui/components/hero'
import { Ximera } from '@/ui/components/ximera'

export const Route = createFileRoute('/$lng/_public/')({
  component: function HomePage() {
    const { lng } = Route.useParams()
    return (
      <>
        <Hero lng={lng} />
        <Ximera />
      </>
    )
  },
})
