import { Button, Container, Section } from '@infonomic/uikit/react'
import { LangLink, Link } from '@modulus-learning/host-tanstack-start/framework/index'
import type { Locale } from '@modulus-learning/host-tanstack-start/i18n/i18n-config'
import { ShieldCheck } from 'lucide-react'

import osuBlack from '@/ui/images/osu-black.svg'
import osuWhite from '@/ui/images/osu-white.svg'
import { HeroFlow } from './hero-flow'

export function Hero({ lng }: { lng: Locale }) {
  return (
    <Section className="pt-10 pb-20 md:pt-16">
      <Container className="xl:max-w-[68rem] 2xl:max-w-[74.375rem]">
        <div className="grid items-center gap-14 lg:grid-cols-[5fr_6fr] lg:gap-16">
          <div>
            <img
              src={osuBlack}
              width={140}
              height={96}
              alt="The Ohio State University"
              className="mx-auto mb-10 block dark:hidden"
            />
            <img
              src={osuWhite}
              width={140}
              height={96}
              alt="The Ohio State University"
              className="mx-auto mb-10 hidden dark:block"
            />

            <h1 className="mb-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-gray-950 md:text-5xl lg:text-[3rem] dark:text-white">
              Modulus for Ximera and Carmen
            </h1>

            <p className="mb-8 max-w-xl text-pretty text-lg text-gray-700 dark:text-gray-200">
              Modulus connects Ximera's interactive textbooks to Carmen. It records how each student
              moves through an activity and sends their score to the Carmen gradebook, so you never
              export or re-enter grades.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                render={<LangLink lng={lng} href="/docs/introduction" />}
                size="lg"
                className="w-full sm:w-auto"
              >
                Read how it works
              </Button>
              <Button
                render={
                  <Link href="https://ximera.osu.edu/" target="_blank" rel="noopener noreferrer" />
                }
                variant="outlined"
                size="lg"
                className="w-full sm:w-auto"
              >
                Visit Ximera
              </Button>
            </div>

            <p className="mt-8 flex max-w-md items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Ximera activities never receive a student's email, OSU ID or Carmen grades.
              </span>
            </p>
          </div>

          <HeroFlow />
        </div>
      </Container>
    </Section>
  )
}
