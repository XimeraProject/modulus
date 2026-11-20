import { createFileRoute } from '@tanstack/react-router'

import { GradientGlow } from '@modulus-learning/host-tanstack-start/ui/components/gradient'

import { Hero } from '@/ui/components/hero'
import { Ximera } from '@/ui/components/ximera'

export const Route = createFileRoute('/$lng/_public/')({
  component: function HomePage() {
    const { lng } = Route.useParams()
    return (
      <>
        <GradientGlow />
        <Hero lng={lng} />
        <Ximera />
      </>
    )
  },
})
